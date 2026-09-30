from rest_framework.routers import DefaultRouter

from .views import EvaluationCriteriaViewSet, EvaluationSubmissionViewSet

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EvaluationCriteriaViewSet,
    EvaluationSubmissionViewSet,
    MyEvaluableCoursesAPIView,
    MyCampaignsAPIView,
    TeacherReportViewSet,
    TeacherDashboardAPIView,
    TeacherCourseDetailAPIView,
    EvaluationDraftAPIView,
    EvaluationDraftDetailAPIView,
    TeacherRankingStudentAPIView,
    TeacherSelfAssessmentAPIView,
)

router = DefaultRouter()
router.register(r"criteria", EvaluationCriteriaViewSet, basename="evaluation-criteria")
router.register(r"submissions", EvaluationSubmissionViewSet, basename="evaluation-submissions")
router.register(r"teacher-reports", TeacherReportViewSet, basename="teacher-reports")

urlpatterns = [
    path("my-courses/", MyEvaluableCoursesAPIView.as_view(), name="my-evaluable-courses"),
    path("my-campaigns/", MyCampaignsAPIView.as_view(), name="my-campaigns"),
    path("teacher-dashboard/", TeacherDashboardAPIView.as_view(), name="teacher-dashboard"),
    path(
        "teacher-dashboard/courses/<uuid:course_id>/",
        TeacherCourseDetailAPIView.as_view(),
        name="teacher-dashboard-course",
    ),
    path("drafts/", EvaluationDraftAPIView.as_view(), name="evaluation-draft"),
    path("drafts/<uuid:campaign_id>/<uuid:course_id>/", EvaluationDraftDetailAPIView.as_view(), name="evaluation-draft-detail"),
    path("teacher-ranking/", TeacherRankingStudentAPIView.as_view(), name="teacher-ranking-student"),
    path("self-assessment/", TeacherSelfAssessmentAPIView.as_view(), name="teacher-self-assessment"),
]

urlpatterns += router.urls