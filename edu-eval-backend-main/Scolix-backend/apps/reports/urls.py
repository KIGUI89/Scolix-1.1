from django.urls import path
from .views import (
    TeacherRankingCSVView,
    TeacherRankingExcelView,
    CampaignResultsCSVView,
    AttendanceCSVView,
    TeacherSummaryPDFView,
)

urlpatterns = [
    path("ranking/csv/",                              TeacherRankingCSVView.as_view(),     name="report-ranking-csv"),
    path("ranking/excel/",                            TeacherRankingExcelView.as_view(),   name="report-ranking-excel"),
    path("campaigns/<uuid:campaign_id>/csv/",         CampaignResultsCSVView.as_view(),    name="report-campaign-csv"),
    path("attendance/csv/",                           AttendanceCSVView.as_view(),         name="report-attendance-csv"),
    path("teachers/<uuid:teacher_id>/pdf/",           TeacherSummaryPDFView.as_view(),     name="report-teacher-pdf"),
]
