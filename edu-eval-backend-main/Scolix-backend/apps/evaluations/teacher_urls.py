from django.urls import path
from .teacher_views import TeacherListView, TeacherDetailView, TeacherScoresView, TeacherCommentsView
from apps.attendance.views import TeacherAttendanceView

urlpatterns = [
    path("",                                      TeacherListView.as_view(),       name="teacher-list"),
    path("<uuid:teacher_id>/",                    TeacherDetailView.as_view(),     name="teacher-detail"),
    path("<uuid:teacher_id>/scores/",             TeacherScoresView.as_view(),     name="teacher-scores"),
    path("<uuid:teacher_id>/comments/",           TeacherCommentsView.as_view(),   name="teacher-comments"),
    path("<uuid:teacher_id>/attendance/",         TeacherAttendanceView.as_view(), name="teacher-attendance"),
]
