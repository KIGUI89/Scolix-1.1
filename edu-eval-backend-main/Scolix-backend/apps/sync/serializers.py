from rest_framework import serializers

from .models import (
    Department,
    AcademicSemester,
    Grade,
    TeacherSync,
    StudentSync,
    CourseSync,
    StudentCourseEnrollment,
    SyncLog,
)


class DepartmentSerializer(serializers.ModelSerializer):
    teachers_count = serializers.IntegerField(source="teachers.count", read_only=True)
    courses_count = serializers.IntegerField(source="courses.count", read_only=True)

    class Meta:
        model = Department
        fields = "__all__"


class AcademicSemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicSemester
        fields = "__all__"

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                "end_date": "La date de fin doit être supérieure à la date de début."
            })

        return attrs


class GradeSerializer(serializers.ModelSerializer):
    teachers_count = serializers.IntegerField(source="teachers.count", read_only=True)

    class Meta:
        model = Grade
        fields = "__all__"


class TeacherSyncSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    full_name = serializers.CharField(read_only=True)
    grade_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherSync
        fields = "__all__"

    def get_grade_name(self, obj):
        return obj.grade.name if obj.grade_id else None


class StudentSyncSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = StudentSync
        fields = "__all__"


class CourseSyncSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    grade_name = serializers.SerializerMethodField()
    secondary_teacher_names = serializers.SerializerMethodField()

    class Meta:
        model = CourseSync
        fields = "__all__"

    def get_grade_name(self, obj):
        return obj.grade.name if obj.grade_id else None

    def get_secondary_teacher_names(self, obj):
        return [t.full_name for t in obj.secondary_teachers.all()]

    def validate(self, attrs):
        teacher = attrs.get("teacher", getattr(self.instance, "teacher", None))
        secondary_teachers = attrs.get("secondary_teachers")
        department = attrs.get("department", getattr(self.instance, "department", None))

        if secondary_teachers is not None and teacher is not None and teacher in secondary_teachers:
            raise serializers.ValidationError(
                {"secondary_teachers": "Le professeur principal ne peut pas aussi être professeur secondaire."}
            )

        # Les professeurs secondaires doivent être de la même filière que le
        # cours (confirmé avec l'utilisateur) — contrairement au principal,
        # qui peut dispenser le même cours dans plusieurs filières différentes
        # (via des fiches cours distinctes, une par filière).
        if secondary_teachers is not None and department is not None:
            mismatched = [t.full_name for t in secondary_teachers if t.department_id != department.id]
            if mismatched:
                raise serializers.ValidationError(
                    {"secondary_teachers": f"Doivent être de la même filière que le cours : {', '.join(mismatched)}."}
                )

        return attrs


class StudentCourseEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_code = serializers.CharField(source="student.student_code", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    department = serializers.CharField(source="course.department_id", read_only=True)
    department_name = serializers.CharField(source="course.department.name", read_only=True)
    academic_year = serializers.CharField(source="semester.academic_year", read_only=True)

    class Meta:
        model = StudentCourseEnrollment
        fields = "__all__"
        read_only_fields = ["semester"]

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        course = attrs.get("course", getattr(self.instance, "course", None))

        duplicate = StudentCourseEnrollment.objects.filter(student=student, course=course)
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("Cet étudiant est déjà inscrit à ce cours.")

        return attrs

    def create(self, validated_data):
        validated_data["semester"] = validated_data["course"].semester
        return super().create(validated_data)

    def update(self, instance, validated_data):
        course = validated_data.get("course", instance.course)
        validated_data["semester"] = course.semester
        return super().update(instance, validated_data)


class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = "__all__"