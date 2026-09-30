from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .serializers import LoginSerializer, UserSerializer

from rest_framework import viewsets, filters
from apps.authentication.permissions import IsAdmin
from apps.sync.models import StudentSync, TeacherSync
from .models import User
from .serializers import CreateUserSerializer, SetPasswordSerializer, UpdateUserSerializer


class LoginView(APIView):
    permission_classes = []

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer},
        description="Connexion utilisateur avec email et mot de passe. Retourne access token, refresh token et infos utilisateur.",
    )
    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer},
        description="Retourne les informations de l'utilisateur connecté.",
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
    
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related(
        "teacher_profile",
        "student_profile",
    ).all()

    permission_classes = [IsAdmin]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "email",
        "role",
        "teacher_profile__first_name",
        "teacher_profile__last_name",
        "student_profile__first_name",
        "student_profile__last_name",
    ]
    ordering_fields = ["email", "role", "created_at"]
    ordering = ["email"]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return CreateUserSerializer
        if self.action in ("update", "partial_update"):
            return UpdateUserSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=["get"], url_path="passwordless")
    def passwordless(self, request):
        """Liste les identités d'un type donné n'ayant pas encore de mot de passe."""
        role = request.query_params.get("role")
        if role not in User.Role.values:
            return Response({"detail": "Paramètre 'role' invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if role == User.Role.STUDENT:
            profiles = StudentSync.objects.filter(
                user_account__isnull=True, is_active=True
            ).order_by("last_name", "first_name")
            data = [
                {"id": str(p.id), "full_name": p.full_name, "email": p.email, "code": p.student_code}
                for p in profiles
            ]
        elif role == User.Role.TEACHER:
            profiles = TeacherSync.objects.filter(
                user_account__isnull=True, is_active=True
            ).order_by("last_name", "first_name")
            data = [
                {"id": str(p.id), "full_name": p.full_name, "email": p.email, "code": p.matricule}
                for p in profiles
            ]
        else:
            users = User.objects.filter(
                role=role, password__startswith=UNUSABLE_PASSWORD_PREFIX
            ).order_by("email")
            data = [
                {"id": str(u.id), "full_name": u.email, "email": u.email, "code": ""}
                for u in users
            ]

        return Response(data)

    @action(detail=False, methods=["post"], url_path="assign-password")
    def assign_password(self, request):
        """Assigne un mot de passe à une identité qui n'en a pas encore, en réutilisant
        la logique de création/hashage existante (CreateUserSerializer / set_password)."""
        role = request.data.get("role")
        target_id = request.data.get("id")

        if role not in User.Role.values:
            return Response({"detail": "Paramètre 'role' invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if not target_id:
            return Response({"detail": "Identifiant manquant."}, status=status.HTTP_400_BAD_REQUEST)

        if role == User.Role.STUDENT:
            profile = get_object_or_404(StudentSync, id=target_id)
            payload = {
                "email": profile.email,
                "password": request.data.get("password"),
                "role": role,
                "student_profile_id": str(profile.id),
            }
            serializer = CreateUserSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
        elif role == User.Role.TEACHER:
            profile = get_object_or_404(TeacherSync, id=target_id)
            payload = {
                "email": profile.email,
                "password": request.data.get("password"),
                "role": role,
                "teacher_profile_id": str(profile.id),
            }
            serializer = CreateUserSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
        else:
            user = get_object_or_404(User, id=target_id, role=role)
            if user.has_usable_password():
                return Response(
                    {"detail": "Cet utilisateur possède déjà un mot de passe."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            password_serializer = SetPasswordSerializer(data={"password": request.data.get("password")})
            password_serializer.is_valid(raise_exception=True)
            user.set_password(password_serializer.validated_data["password"])
            user.save()

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)