from rest_framework import filters, viewsets
from django.db.models import Avg, Count

from apps.authentication.permissions import IsAdminOrDirector
from .models import EvaluationCriteria
from .serializers import EvaluationCriteriaSerializer

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.evaluations.services import EvaluationSubmissionService
from .models import EvaluationSubmission
from .serializers import (
    EvaluationCriteriaSerializer,
    EvaluationSubmissionCreateSerializer,
    EvaluationSubmissionSerializer,
    EvaluationDraftSerializer,
    TeacherSelfAssessmentSaveSerializer,
    TeacherSelfAssessmentSerializer,
)
from .services import TeacherSelfAssessmentService

from rest_framework.views import APIView

from apps.campaigns.models import EvaluationCampaign
from apps.campaigns.services import CampaignService
from apps.sync.models import StudentCourseEnrollment
from .serializers import MyEvaluableCourseSerializer
from apps.authentication.permissions import IsTeacher
from .services import TeacherDashboardService
from .serializers import TeacherDashboardSerializer
from .models import TeacherReport
from .serializers import (
    TeacherReportSerializer,
    TeacherReportCreateSerializer,
    TeacherReportAdminSerializer,
    TeacherReportMessageSerializer,
)
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import action
from apps.notifications.services import NotificationService



class EvaluationCriteriaViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriteria.objects.all()
    serializer_class = EvaluationCriteriaSerializer
    #permission_classes = [IsAdminOrDirector]
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "name",
        "description",
        "category",
    ]
    ordering_fields = [
        "name",
        "category",
        "created_at",
    ]
    ordering = ["category", "name"]

    def get_permissions(self):
        # Lecture pour tous, écriture pour admin seulement
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrDirector()]
        return [IsAuthenticated()]

class EvaluationSubmissionViewSet(viewsets.ModelViewSet):
    queryset = EvaluationSubmission.objects.select_related(
        "campaign",
        "course",
        "teacher",
        "student",
    ).prefetch_related("responses", "responses__criteria")

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return EvaluationSubmissionCreateSerializer
        return EvaluationSubmissionSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role in ["ADMIN", "DIRECTOR"]:
            qs = self.queryset
            semester_id = self.request.query_params.get("semester_id")
            if semester_id:
                qs = qs.filter(campaign__semester_id=semester_id)
            return qs

        if user.role == "STUDENT":
            return self.queryset.filter(student=user)

        if user.role == "TEACHER" and user.teacher_profile:
            # `teacher` (pas `course__teacher`) : un enseignant ne doit voir que
            # les soumissions qui l'évaluent lui, pas toutes celles du cours —
            # sinon un professeur secondaire verrait aussi les notes destinées
            # au principal (et inversement).
            return self.queryset.filter(teacher=user.teacher_profile)

        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = EvaluationSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            submission = EvaluationSubmissionService.submit_evaluation(
                student_user=request.user,
                campaign=serializer.validated_data["campaign_id"],
                course=serializer.validated_data["course_id"],
                teacher=serializer.validated_data["teacher_id"],
                responses_data=serializer.validated_data["responses"],
                recommendation_score=serializer.validated_data["recommendation_score"],
            )
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            EvaluationSubmissionSerializer(submission, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EvaluationDraftAPIView(APIView):
    """PUT /api/evaluations/drafts/ — enregistre (crée ou met à jour) le brouillon
    de l'étudiant courant pour une campagne/cours donnés."""
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = EvaluationDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            submission = EvaluationSubmissionService.save_draft(
                student_user=request.user,
                campaign=serializer.validated_data["campaign_id"],
                course=serializer.validated_data["course_id"],
                teacher=serializer.validated_data["teacher_id"],
                responses_data=serializer.validated_data.get("responses", []),
                recommendation_score=serializer.validated_data.get("recommendation_score"),
            )
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            EvaluationSubmissionSerializer(submission, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EvaluationDraftDetailAPIView(APIView):
    """GET /api/evaluations/drafts/<campaign_id>/<course_id>/?teacher_id=... —
    récupère le brouillon existant de l'étudiant courant pour préremplir le
    formulaire. teacher_id requis depuis qu'un cours peut avoir plusieurs
    enseignants évaluables (principal + secondaires)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id, course_id):
        if request.user.role != "STUDENT":
            return Response({"detail": "Réservé aux étudiants."}, status=status.HTTP_403_FORBIDDEN)

        teacher_id = request.query_params.get("teacher_id")
        if not teacher_id:
            return Response({"detail": "teacher_id requis."}, status=status.HTTP_400_BAD_REQUEST)

        submission = EvaluationSubmissionService.get_draft(
            student_user=request.user, campaign_id=campaign_id, course_id=course_id, teacher_id=teacher_id,
        )
        if not submission:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(EvaluationSubmissionSerializer(submission, context={"request": request}).data)


class MyEvaluableCoursesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Auto-correction paresseuse (aucune tâche planifiée dans ce projet) :
        # cet endpoint est interrogé automatiquement toutes les 30s par chaque
        # étudiant connecté, ce qui en fait le déclencheur le plus fiable pour
        # une relance vraiment "automatique" sans dépendre d'une visite admin.
        # Ne doit jamais casser le tableau de bord de l'étudiant.
        try:
            CampaignService.send_pending_reminders_if_due()
        except Exception:
            pass

        if user.role != "STUDENT" or not user.student_profile:
            return Response(
                {"detail": "Seuls les étudiants peuvent accéder à cette ressource."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # is_deleted=True == campagne supprimée par l'admin de son interface :
        # elle ne doit plus jamais être proposée à un étudiant, même si son
        # statut est resté "ACTIVE" au moment de la suppression.
        active_campaigns = EvaluationCampaign.objects.filter(
            status=EvaluationCampaign.Status.ACTIVE,
            is_deleted=False,
        )

        enrollments = StudentCourseEnrollment.objects.select_related(
            "course",
            "course__teacher",
            "semester",
        ).prefetch_related("course__secondary_teachers").filter(
            student=user.student_profile,
            student__is_active=True,
            is_active=True,
            semester__in=active_campaigns.values("semester"),
        )

        data = []

        for enrollment in enrollments:
            campaign = active_campaigns.filter(
                semester=enrollment.semester
            ).first()

            if not campaign or not campaign.is_open:
                continue

            # Une tâche par enseignant évaluable sur ce cours (principal +
            # secondaires) : chacun doit être évalué séparément (voir
            # CourseSync.secondary_teachers), jamais une seule note partagée.
            course = enrollment.course
            teachers = [(course.teacher, False)] + [(t, True) for t in course.secondary_teachers.all()]

            for teacher, is_secondary in teachers:
                existing = EvaluationSubmission.objects.filter(
                    campaign=campaign,
                    course=course,
                    teacher=teacher,
                    student=user,
                ).only("status").first()

                data.append({
                    "course_id": course.id,
                    "course_code": course.code,
                    "course_name": course.name,
                    "teacher_id": teacher.id,
                    "teacher_name": teacher.full_name,
                    "is_secondary_teacher": is_secondary,
                    "semester_id": enrollment.semester.id,
                    "semester_name": enrollment.semester.name,
                    "campaign_id": campaign.id,
                    "campaign_title": campaign.title,
                    "campaign_end_date": campaign.end_date,
                    "already_submitted": bool(existing and existing.status == EvaluationSubmission.Status.SUBMITTED),
                    "has_draft": bool(existing and existing.status == EvaluationSubmission.Status.DRAFT),
                })

        serializer = MyEvaluableCourseSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyCampaignsAPIView(APIView):
    """
    GET /api/evaluations/my-campaigns/ — pour la page d'accueil étudiant :
    campagnes ACTIVE (évaluables) et CLOSED (historique, "Terminée" — sans
    accès au détail, contrairement à MyEvaluableCoursesAPIView qui reste
    strictement limitée aux campagnes ACTIVE).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != "STUDENT" or not user.student_profile:
            return Response(
                {"detail": "Seuls les étudiants peuvent accéder à cette ressource."},
                status=status.HTTP_403_FORBIDDEN,
            )

        campaigns = EvaluationCampaign.objects.filter(
            is_deleted=False,
            status__in=[EvaluationCampaign.Status.ACTIVE, EvaluationCampaign.Status.CLOSED],
        ).select_related("semester")

        data = []
        for campaign in campaigns:
            enrollments = StudentCourseEnrollment.objects.filter(
                student=user.student_profile,
                student__is_active=True,
                is_active=True,
                semester=campaign.semester,
            )
            total = enrollments.count()
            if total == 0:
                continue

            submitted = EvaluationSubmission.objects.filter(
                campaign=campaign,
                student=user,
                course_id__in=enrollments.values_list("course_id", flat=True),
            ).count()

            data.append({
                "campaign_id":       str(campaign.id),
                "campaign_title":    campaign.title,
                "semester_name":     campaign.semester.name,
                "status":            campaign.status,
                "total_courses":     total,
                "submitted_courses": submitted,
            })

        return Response(data, status=status.HTTP_200_OK)


class TeacherReportViewSet(viewsets.ModelViewSet):
    """
    Signalement libre d'un étudiant sur un professeur (non anonyme).
    L'étudiant crée et consulte ses signalements ; l'admin et le directeur
    les listent (filtrables par ?status=), les consultent, y répondent
    (POST {id}/respond/) et adressent une mise en garde à l'enseignant
    (POST {id}/warn/). Pas d'édition/suppression exposée.
    """
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAuthenticated]
    queryset = TeacherReport.objects.select_related("student", "student__student_profile", "teacher", "department")

    def _is_staff(self):
        return self.request.user.role in ["ADMIN", "DIRECTOR"]

    def get_permissions(self):
        if self.action in ["respond", "warn"]:
            return [IsAuthenticated(), IsAdminOrDirector()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return TeacherReportCreateSerializer
        if self._is_staff():
            return TeacherReportAdminSerializer
        return TeacherReportSerializer

    def get_queryset(self):
        user = self.request.user
        # .all() : ne jamais réutiliser le queryset de classe, dont le cache
        # de résultats figerait la liste entre deux requêtes.
        base = self.queryset.all()
        if self._is_staff():
            qs = base
            status_filter = self.request.query_params.get("status")
            if status_filter in TeacherReport.Status.values:
                qs = qs.filter(status=status_filter)
            return qs
        if user.role == "STUDENT":
            return base.filter(student=user)
        return base.none()

    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        # Première consultation par l'administration : nouveau → lu.
        if self._is_staff() and report.status == TeacherReport.Status.NEW:
            report.status = TeacherReport.Status.READ
            report.save(update_fields=["status"])
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        report = self.get_object()
        serializer = TeacherReportMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            report.admin_response = serializer.validated_data["message"]
            report.response_at = timezone.now()
            report.status = TeacherReport.Status.TREATED
            report.save(update_fields=["admin_response", "response_at", "status"])
            NotificationService.notify_student_report_response(report)
        return Response(TeacherReportAdminSerializer(report).data)

    @action(detail=True, methods=["post"])
    def warn(self, request, pk=None):
        report = self.get_object()
        serializer = TeacherReportMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            report.teacher_warning = serializer.validated_data["message"]
            report.warned_at = timezone.now()
            update_fields = ["teacher_warning", "warned_at"]
            if report.status == TeacherReport.Status.NEW:
                report.status = TeacherReport.Status.READ
                update_fields.append("status")
            report.save(update_fields=update_fields)
            notification = NotificationService.notify_teacher_warning(report)
        data = TeacherReportAdminSerializer(report).data
        # Signale au client si l'enseignant n'a pas de compte (mise en garde
        # enregistrée mais personne à notifier).
        data["teacher_notified"] = notification is not None
        return Response(data)

    def create(self, request, *args, **kwargs):
        serializer = TeacherReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        teacher = serializer.validated_data["teacher_id"]
        report = TeacherReport.objects.create(
            student=request.user,
            teacher=teacher,
            department=teacher.department,
            title=serializer.validated_data["title"],
            description=serializer.validated_data["description"],
        )
        NotificationService.notify_admins_new_report(report)

        return Response(
            TeacherReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class TeacherDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher_profile = request.user.teacher_profile

        if not teacher_profile:
            return Response(
                {"detail": "Ce compte enseignant n'est lié à aucun profil enseignant ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dashboard = TeacherDashboardService.get_teacher_dashboard(teacher=teacher_profile)

        serializer = TeacherDashboardSerializer(dashboard)

        return Response(serializer.data, status=status.HTTP_200_OK)


class TeacherCourseDetailAPIView(APIView):
    """GET /api/evaluations/teacher-dashboard/courses/{course_id}/ — détail des
    résultats d'un module évalué pour l'enseignant connecté : scores moyens par
    critère et commentaires (anonymes), sur le même périmètre semestriel que
    la liste « Modules évalués »."""
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, course_id):
        teacher_profile = request.user.teacher_profile
        if not teacher_profile:
            return Response(
                {"detail": "Ce compte enseignant n'est lié à aucun profil enseignant ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        detail = TeacherDashboardService.get_course_detail(teacher_profile, course_id)
        if detail is None:
            return Response(
                {"detail": "Aucune évaluation reçue pour ce module."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(detail, status=status.HTTP_200_OK)


class TeacherRankingStudentAPIView(APIView):
    """GET /api/evaluations/teacher-ranking/?scope=mine|all — classement des
    enseignants réservé aux étudiants : moyenne des scores globaux de toutes
    les évaluations reçues dans les campagnes clôturées (le classement n'est
    donc publié qu'à la clôture de chaque campagne), sans seuil de réponses."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "STUDENT" or not request.user.student_profile:
            return Response(
                {"detail": "Réservé aux étudiants."},
                status=status.HTTP_403_FORBIDDEN,
            )

        scope = request.query_params.get("scope", "mine")

        qs = EvaluationSubmission.objects.filter(
            status=EvaluationSubmission.Status.SUBMITTED,
            campaign__status=EvaluationCampaign.Status.CLOSED,
        )
        if scope == "mine":
            qs = qs.filter(teacher__department=request.user.student_profile.department)

        rows = (
            qs.values(
                "teacher__id",
                "teacher__first_name",
                "teacher__last_name",
                "teacher__department__name",
            )
            .annotate(avg_score=Avg("global_score"), total=Count("id"))
            .order_by("-avg_score", "teacher__last_name")
        )

        data = [
            {
                "rank": i + 1,
                "teacher_id": r["teacher__id"],
                "teacher_name": f'{r["teacher__first_name"]} {r["teacher__last_name"]}',
                "department_name": r["teacher__department__name"],
                "avg_score": round(float(r["avg_score"]), 1),
                "total_evaluations": r["total"],
            }
            for i, r in enumerate(rows)
        ]

        return Response(data, status=status.HTTP_200_OK)


class TeacherSelfAssessmentAPIView(APIView):
    """PUT /api/evaluations/self-assessment/ — enregistre (upsert) l'auto-
    évaluation du semestre courant pour l'enseignant connecté.
    GET  /api/evaluations/self-assessment/ — récupère la dernière soumise."""
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        if not request.user.teacher_profile:
            return Response(
                {"detail": "Ce compte enseignant n'est lié à aucun profil enseignant ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assessment = TeacherSelfAssessmentService.get_latest(request.user.teacher_profile)
        if not assessment:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(TeacherSelfAssessmentSerializer(assessment).data)

    def put(self, request):
        if not request.user.teacher_profile:
            return Response(
                {"detail": "Ce compte enseignant n'est lié à aucun profil enseignant ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TeacherSelfAssessmentSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            assessment = TeacherSelfAssessmentService.save(
                teacher=request.user.teacher_profile,
                responses_data=serializer.validated_data["responses"],
            )
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(TeacherSelfAssessmentSerializer(assessment).data, status=status.HTTP_200_OK)