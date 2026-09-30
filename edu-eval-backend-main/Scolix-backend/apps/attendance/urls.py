from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AttendanceRecordViewSet, JustifyAttendanceView, AttendanceAlertViewSet

router = DefaultRouter()
router.register(r"records", AttendanceRecordViewSet, basename="attendance-records")
router.register(r"alerts",  AttendanceAlertViewSet,  basename="attendance-alerts")

urlpatterns = [path("justify/", JustifyAttendanceView.as_view(), name="attendance-justify")] + router.urls
