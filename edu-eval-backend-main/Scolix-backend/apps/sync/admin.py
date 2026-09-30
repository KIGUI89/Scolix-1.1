from django.contrib import admin
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


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active", "synced_at")
    search_fields = ("code", "name")
    list_filter = ("is_active",)


@admin.register(AcademicSemester)
class AcademicSemesterAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "start_date", "end_date", "is_active")
    search_fields = ("name", "academic_year")
    list_filter = ("academic_year", "is_active")


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ("name", "rank_order", "is_active")
    search_fields = ("name",)
    list_filter = ("is_active",)
    ordering = ("rank_order", "name")


@admin.register(TeacherSync)
class TeacherSyncAdmin(admin.ModelAdmin):
    list_display = ("matricule", "full_name", "email", "department", "grade", "is_active")
    search_fields = ("matricule", "university_id", "first_name", "last_name", "email")
    list_filter = ("department", "grade", "is_active")


@admin.register(StudentSync)
class StudentSyncAdmin(admin.ModelAdmin):
    list_display = ("student_code", "full_name", "email", "department", "level", "cohort", "is_active")
    search_fields = ("student_code", "university_id", "first_name", "last_name", "email")
    list_filter = ("department", "level", "cohort", "is_active")


@admin.register(CourseSync)
class CourseSyncAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "teacher", "department", "semester", "level", "cohort", "is_active")
    search_fields = ("code", "university_id", "name", "teacher__first_name", "teacher__last_name")
    list_filter = ("department", "semester", "level", "cohort", "is_active")


@admin.register(StudentCourseEnrollment)
class StudentCourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "semester", "is_active", "enrolled_at")
    search_fields = ("student__first_name", "student__last_name", "student__student_code", "course__code")
    list_filter = ("semester", "is_active")


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = (
        "sync_type",
        "status",
        "teachers_count",
        "students_count",
        "courses_count",
        "enrollments_count",
        "started_at",
        "ended_at",
    )
    list_filter = ("sync_type", "status")
    search_fields = ("message",)
    readonly_fields = ("started_at",)