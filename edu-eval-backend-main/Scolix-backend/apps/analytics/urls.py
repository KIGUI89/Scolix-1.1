from django.urls import path
from .views1 import (
    DashboardKPIView, TeacherRankingView, DepartmentHeatmapView, ScoreTrendsView,
    StudentCompletionView, RemindStudentView,
    ClassificationView, ClassificationConfigView, ScoreAlertsView,
    PunctualitySatisfactionCorrelationView,
)

urlpatterns = [
    path("kpis/",                         DashboardKPIView.as_view(),         name="analytics-kpis"),
    path("ranking/",                      TeacherRankingView.as_view(),       name="analytics-ranking"),
    path("heatmap/",                      DepartmentHeatmapView.as_view(),    name="analytics-heatmap"),
    path("trends/",                       ScoreTrendsView.as_view(),          name="analytics-trends"),
    path("students-completion/",          StudentCompletionView.as_view(),    name="analytics-students-completion"),
    path("students-completion/remind/",   RemindStudentView.as_view(),        name="analytics-remind-student"),
    path("classification/",               ClassificationView.as_view(),       name="analytics-classification"),
    path("classification/config/",        ClassificationConfigView.as_view(), name="analytics-classification-config"),
    path("alerts/",                       ScoreAlertsView.as_view(),          name="analytics-alerts"),
    path("punctuality-correlation/",      PunctualitySatisfactionCorrelationView.as_view(), name="analytics-punctuality-correlation"),
]
