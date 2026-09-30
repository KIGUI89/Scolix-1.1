from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    list_display = (
        "email",
        "role",
        "is_active",
        "is_staff",
        "is_verified",
        "created_at",
    )

    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_verified",
    )

    search_fields = (
        "email",
        "teacher_profile__first_name",
        "teacher_profile__last_name",
        "student_profile__first_name",
        "student_profile__last_name",
    )

    ordering = ("email",)

    fieldsets = (
        ("Connexion", {
            "fields": ("email", "password")
        }),
        ("Rôle et liaison ERP", {
            "fields": ("role", "teacher_profile", "student_profile")
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_verified",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Dates", {
            "fields": ("last_login", "created_at", "updated_at")
        }),
    )

    add_fieldsets = (
        ("Créer un utilisateur", {
            "classes": ("wide",),
            "fields": (
                "email",
                "role",
                "password1",
                "password2",
                "teacher_profile",
                "student_profile",
                "is_active",
                "is_staff",
                "is_verified",
            ),
        }),
    )

    readonly_fields = ("created_at", "updated_at", "last_login")