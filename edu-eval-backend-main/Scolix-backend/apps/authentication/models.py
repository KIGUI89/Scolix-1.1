import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.sync.models import TeacherSync, StudentSync
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        TEACHER = "TEACHER", "Enseignant"
        STUDENT = "STUDENT", "Étudiant"
        DIRECTOR = "DIRECTOR", "Directeur"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)

    teacher_profile = models.OneToOneField(
        TeacherSync,
        on_delete=models.PROTECT,
        related_name="user_account",
        null=True,
        blank=True,
    )

    student_profile = models.OneToOneField(
        StudentSync,
        on_delete=models.PROTECT,
        related_name="user_account",
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "auth_users"
        ordering = ["email"]

    def clean(self):
        if self.role == self.Role.TEACHER and not self.teacher_profile:
            raise ValidationError("Un utilisateur TEACHER doit être lié à un enseignant ERP.")

        if self.role == self.Role.STUDENT and not self.student_profile:
            raise ValidationError("Un utilisateur STUDENT doit être lié à un étudiant ERP.")

        if self.role in [self.Role.ADMIN, self.Role.DIRECTOR]:
            if self.teacher_profile or self.student_profile:
                raise ValidationError("ADMIN/DIRECTOR ne doit pas être lié à un profil étudiant ou enseignant.")

        if self.teacher_profile and self.student_profile:
            raise ValidationError("Un utilisateur ne peut pas être à la fois enseignant et étudiant.")

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.role})"