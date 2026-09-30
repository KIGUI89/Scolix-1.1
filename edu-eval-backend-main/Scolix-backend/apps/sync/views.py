from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authentication.permissions import IsAdminOrDirector

from .services import SemesterService

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

from .serializers import (
    DepartmentSerializer,
    AcademicSemesterSerializer,
    GradeSerializer,
    TeacherSyncSerializer,
    StudentSyncSerializer,
    CourseSyncSerializer,
    StudentCourseEnrollmentSerializer,
    SyncLogSerializer,
)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["code", "name"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        # Un département « supprimé » est seulement désactivé : il disparaît
        # de la liste, mais reste consultable par son identifiant.
        qs = super().get_queryset()
        if self.action == "list":
            qs = qs.filter(is_active=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        # Suppression logique uniquement : rien n'est effacé en base.
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AcademicSemesterViewSet(viewsets.ModelViewSet):
    queryset = AcademicSemester.objects.all()
    serializer_class = AcademicSemesterSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "academic_year"]
    ordering_fields = ["start_date", "end_date", "name"]
    ordering = ["-start_date"]

    def get_queryset(self):
        # Auto-correction paresseuse : à chaque lecture de la liste des
        # semestres, on aligne d'abord leur statut actif/inactif sur la date
        # du jour, sans qu'aucune action manuelle ne soit nécessaire.
        SemesterService.sync_statuses()
        return super().get_queryset()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer ce semestre : des cours, campagnes ou inscriptions "
                            "y sont rattachés."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "rank_order", "created_at"]
    ordering = ["rank_order", "name"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer ce grade : des enseignants y sont rattachés."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherSyncViewSet(viewsets.ModelViewSet):
    queryset = TeacherSync.objects.select_related("department", "grade").all()
    serializer_class = TeacherSyncSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "university_id",
        "matricule",
        "first_name",
        "last_name",
        "email",
        "department__name",
        "grade__name",
        "specialty",
    ]
    ordering_fields = [
        "last_name", "first_name", "email", "created_at",
        "grade__rank_order", "grade__name",
    ]
    ordering = ["last_name", "first_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("1", "true", "yes"))
        grade = self.request.query_params.get("grade")
        if grade:
            qs = qs.filter(grade_id=grade)
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer cet enseignant : des cours, évaluations ou un compte "
                            "utilisateur lui sont associés. Désactivez-le plutôt via son statut."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentSyncViewSet(viewsets.ModelViewSet):
    queryset = StudentSync.objects.select_related("department").all()
    serializer_class = StudentSyncSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "university_id",
        "student_code",
        "first_name",
        "last_name",
        "email",
        "department__name",
        "level",
        "cohort",
    ]
    ordering_fields = ["last_name", "first_name", "student_code", "created_at"]
    ordering = ["last_name", "first_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level)
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)
        academic_year = self.request.query_params.get("academic_year")
        if academic_year:
            qs = qs.filter(academic_year=academic_year)
        return qs

    @action(detail=False, methods=["get"])
    def departments_by_level(self, request):
        level = request.query_params.get("level")
        if not level:
            return Response([])

        qs = (
            Department.objects.filter(students__level=level)
            .annotate(students_count=Count("students", filter=Q(students__level=level)))
            .values("id", "code", "name", "students_count")
            .order_by("name")
        )
        return Response(list(qs))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer cet étudiant : un compte utilisateur lui est associé. "
                            "Désactivez-le plutôt via son statut."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CourseSyncViewSet(viewsets.ModelViewSet):
    queryset = CourseSync.objects.select_related(
        "teacher",
        "department",
        "semester",
    ).all()
    serializer_class = CourseSyncSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "university_id",
        "code",
        "name",
        "teacher__first_name",
        "teacher__last_name",
        "department__name",
        "semester__name",
        "level",
        "cohort",
    ]
    ordering_fields = ["code", "name", "created_at"]
    ordering = ["code"]

    def get_queryset(self):
        qs = super().get_queryset()
        semester = self.request.query_params.get("semester")
        if semester:
            qs = qs.filter(semester_id=semester)
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)
        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "Impossible de supprimer ce cours : des évaluations y sont rattachées. "
                            "Désactivez-le plutôt via son statut."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentCourseEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = StudentCourseEnrollment.objects.select_related(
        "student",
        "course",
        "semester",
        "course__teacher",
    ).all()
    serializer_class = StudentCourseEnrollmentSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "student__student_code",
        "student__first_name",
        "student__last_name",
        "course__code",
        "course__name",
        "semester__name",
    ]
    ordering_fields = ["enrolled_at", "synced_at"]
    ordering = ["-enrolled_at"]

    def get_permissions(self):
        # L'étudiant doit pouvoir lire ses propres inscriptions (départements/
        # professeurs auxquels il est réellement inscrit) pour la page Rapport
        # de l'interface étudiant.
        if self.action == "mine":
            return [IsAuthenticated()]
        return [permission() for permission in self.permission_classes]

    @action(detail=False, methods=["get"])
    def mine(self, request):
        user = request.user
        if user.role != "STUDENT" or not user.student_profile:
            return Response(
                {"detail": "Seuls les étudiants peuvent accéder à cette ressource."},
                status=status.HTTP_403_FORBIDDEN,
            )

        rows = StudentCourseEnrollment.objects.filter(
            student=user.student_profile,
            student__is_active=True,
            is_active=True,
        ).values(
            "course__department__id",
            "course__department__name",
            "course__teacher__id",
            "course__teacher__first_name",
            "course__teacher__last_name",
            "course__id",
            "course__name",
            "course__code",
        ).distinct()

        return Response([
            {
                "department_id":   str(r["course__department__id"]),
                "department_name": r["course__department__name"],
                "teacher_id":      str(r["course__teacher__id"]),
                "teacher_name":    f"{r['course__teacher__first_name']} {r['course__teacher__last_name']}",
                "course_id":       str(r["course__id"]),
                "course_name":     r["course__name"],
                "course_code":     r["course__code"],
            }
            for r in rows
        ])


class SyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SyncLog.objects.all()
    serializer_class = SyncLogSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["sync_type", "status", "message"]
    ordering_fields = ["started_at", "ended_at"]
    ordering = ["-started_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        sync_type = self.request.query_params.get("sync_type")
        if sync_type:
            qs = qs.filter(sync_type=sync_type)
        return qs