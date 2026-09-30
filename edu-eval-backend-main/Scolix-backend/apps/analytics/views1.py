from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdminOrDirector
from apps.campaigns.models import EvaluationCampaign
from apps.notifications.services import NotificationService
from .models import ClassificationConfig
from .services import AnalyticsService


class DashboardKPIView(APIView):
    """GET /api/analytics/kpis/?semester_id=&department_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        department_id = request.query_params.get("department_id")
        return Response({
            "kpis":               AnalyticsService.global_kpis(semester_id, department_id),
            "score_trends":       AnalyticsService.score_trends(),
            "criteria_breakdown": AnalyticsService.criteria_breakdown(semester_id, department_id),
            "attendance_summary": AnalyticsService.attendance_summary(semester_id),
        })


class TeacherRankingView(APIView):
    """GET /api/analytics/ranking/?semester_id=&top_n=10&department_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        top_n = int(request.query_params.get("top_n", 10))
        department_id = request.query_params.get("department_id")
        return Response(AnalyticsService.teacher_ranking(semester_id, top_n, department_id))


class DepartmentHeatmapView(APIView):
    """GET /api/analytics/heatmap/?semester_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        return Response(AnalyticsService.department_heatmap(semester_id))


class ScoreTrendsView(APIView):
    """GET /api/analytics/trends/"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        return Response(AnalyticsService.score_trends())


class StudentCompletionView(APIView):
    """GET /api/analytics/students-completion/?semester_id=&status=completed|pending"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        status_filter = request.query_params.get("status")

        results = AnalyticsService.student_completion(semester_id)
        if status_filter == "completed":
            results = [r for r in results if r["completed"]]
        elif status_filter == "pending":
            results = [r for r in results if not r["completed"]]

        return Response(results)


class RemindStudentView(APIView):
    """POST /api/analytics/students-completion/remind/  {student_id, semester_id?}"""
    permission_classes = [IsAdminOrDirector]

    @transaction.atomic
    def post(self, request):
        student_id = request.data.get("student_id")
        semester_id = request.data.get("semester_id")

        if not student_id:
            return Response({"detail": "student_id est requis."}, status=status.HTTP_400_BAD_REQUEST)

        campaigns = EvaluationCampaign.objects.filter(
            status=EvaluationCampaign.Status.ACTIVE, is_deleted=False,
        )
        if semester_id:
            campaigns = campaigns.filter(semester_id=semester_id)
        campaign = campaigns.order_by("-created_at").first()

        if not campaign:
            return Response({"detail": "Aucune campagne active à relancer."}, status=status.HTTP_400_BAD_REQUEST)

        entry = next(
            (e for e in AnalyticsService.student_completion(campaign_id=campaign.id)
             if e["student_id"] == str(student_id)),
            None,
        )
        if entry is None or entry["completed"]:
            return Response(
                {"detail": "Cet étudiant a déjà terminé cette campagne ou n'y est pas concerné."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notifications = NotificationService.notify_students_pending_campaign(campaign, student_ids=[student_id])
        transaction.on_commit(lambda: NotificationService.dispatch_pending_notifications(notifications))

        return Response({"detail": "Relance envoyée."})


class ClassificationView(APIView):
    """GET /api/analytics/classification/?semester_id=&department_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        department_id = request.query_params.get("department_id")
        return Response(AnalyticsService.teacher_classification(semester_id, department_id))


class ClassificationConfigView(APIView):
    """GET/PATCH /api/analytics/classification/config/"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        cfg = ClassificationConfig.get_solo()
        return Response({
            "exceptional_threshold": float(cfg.exceptional_threshold),
            "progression_threshold": float(cfg.progression_threshold),
        })

    def patch(self, request):
        cfg = ClassificationConfig.get_solo()
        if "exceptional_threshold" in request.data:
            cfg.exceptional_threshold = request.data["exceptional_threshold"]
        if "progression_threshold" in request.data:
            cfg.progression_threshold = request.data["progression_threshold"]
        cfg.save()
        return Response({
            "exceptional_threshold": float(cfg.exceptional_threshold),
            "progression_threshold": float(cfg.progression_threshold),
        })


class ScoreAlertsView(APIView):
    """GET /api/analytics/alerts/?semester_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        return Response(AnalyticsService.score_alerts(semester_id))


class PunctualitySatisfactionCorrelationView(APIView):
    """GET /api/analytics/punctuality-correlation/?semester_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        return Response(AnalyticsService.punctuality_satisfaction_correlation(semester_id))
