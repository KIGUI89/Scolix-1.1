from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


from django.db import transaction
from apps.sync.models import TeacherSync, StudentSync


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    teacher_profile_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    student_profile_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "role",
            "teacher_profile_id",
            "student_profile_id",
            "is_active",
            "is_verified",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        role = attrs.get("role")
        teacher_profile_id = attrs.pop("teacher_profile_id", None)
        student_profile_id = attrs.pop("student_profile_id", None)

        teacher_profile = None
        student_profile = None

        if role == User.Role.TEACHER:
            if not teacher_profile_id:
                raise serializers.ValidationError({
                    "teacher_profile_id": "Un compte enseignant doit être lié à un enseignant ERP."
                })

            try:
                teacher_profile = TeacherSync.objects.get(id=teacher_profile_id)
            except TeacherSync.DoesNotExist:
                raise serializers.ValidationError({
                    "teacher_profile_id": "Enseignant ERP introuvable."
                })

            if hasattr(teacher_profile, "user_account"):
                raise serializers.ValidationError({
                    "teacher_profile_id": "Cet enseignant a déjà un compte utilisateur."
                })

        if role == User.Role.STUDENT:
            if not student_profile_id:
                raise serializers.ValidationError({
                    "student_profile_id": "Un compte étudiant doit être lié à un étudiant ERP."
                })

            try:
                student_profile = StudentSync.objects.get(id=student_profile_id)
            except StudentSync.DoesNotExist:
                raise serializers.ValidationError({
                    "student_profile_id": "Étudiant ERP introuvable."
                })

            if hasattr(student_profile, "user_account"):
                raise serializers.ValidationError({
                    "student_profile_id": "Cet étudiant a déjà un compte utilisateur."
                })

        if role in [User.Role.ADMIN, User.Role.DIRECTOR]:
            if teacher_profile_id or student_profile_id:
                raise serializers.ValidationError(
                    "Un ADMIN ou DIRECTOR ne doit pas être lié à un profil ERP."
                )

        attrs["teacher_profile"] = teacher_profile
        attrs["student_profile"] = student_profile
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.full_clean()
        user.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    teacher_profile_id = serializers.UUIDField(source="teacher_profile.id", read_only=True)
    teacher_name = serializers.CharField(source="teacher_profile.full_name", read_only=True)

    student_profile_id = serializers.UUIDField(source="student_profile.id", read_only=True)
    student_name = serializers.CharField(source="student_profile.full_name", read_only=True)
    student_department = serializers.CharField(source="student_profile.department.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "is_active",
            "is_verified",
            "teacher_profile_id",
            "teacher_name",
            "student_profile_id",
            "student_name",
            "student_department",
            "created_at",
        ]
        read_only_fields = fields


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)


class UpdateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "role", "is_active", "is_verified", "password"]
        read_only_fields = ["id", "email", "role"]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError("Email ou mot de passe incorrect.")

        if not user.is_active:
            raise serializers.ValidationError("Ce compte est désactivé.")

        attrs["user"] = user
        return attrs