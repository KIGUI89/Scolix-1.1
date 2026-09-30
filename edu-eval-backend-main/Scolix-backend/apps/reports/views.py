from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdminOrDirector
from .services import ReportService


class TeacherRankingCSVView(APIView):
    """GET /api/reports/ranking/csv/?semester_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        return ReportService.teacher_ranking_csv(semester_id)


class TeacherRankingExcelView(APIView):
    """GET /api/reports/ranking/excel/?semester_id="""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        try:
            return ReportService.teacher_ranking_excel(semester_id)
        except ImportError as e:
            return Response({"detail": str(e)}, status=status.HTTP_501_NOT_IMPLEMENTED)


class CampaignResultsCSVView(APIView):
    """GET /api/reports/campaigns/{campaign_id}/csv/"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request, campaign_id):
        return ReportService.campaign_results_csv(campaign_id)


class AttendanceCSVView(APIView):
    """GET /api/reports/attendance/csv/?teacher_id=&period=YYYY-MM"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        teacher_id = request.query_params.get("teacher_id")
        period = request.query_params.get("period")
        return ReportService.attendance_csv(teacher_id, period)


class TeacherSummaryPDFView(APIView):
    """GET /api/reports/teachers/{teacher_id}/pdf/"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request, teacher_id):
        semester_id = request.query_params.get("semester_id")
        try:
            return ReportService.teacher_summary_pdf(teacher_id, semester_id)
        except ImportError as e:
            return Response({"detail": str(e)}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
