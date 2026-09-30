from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    AcademicSemesterViewSet,
    GradeViewSet,
    TeacherSyncViewSet,
    StudentSyncViewSet,
    CourseSyncViewSet,
    StudentCourseEnrollmentViewSet,
    SyncLogViewSet,
)
from .import_views import ImportBatchViewSet

router = DefaultRouter()

router.register(r"departments", DepartmentViewSet, basename="departments")
router.register(r"semesters", AcademicSemesterViewSet, basename="semesters")
router.register(r"grades", GradeViewSet, basename="grades")
router.register(r"teachers", TeacherSyncViewSet, basename="teachers")
router.register(r"students", StudentSyncViewSet, basename="students")
router.register(r"courses", CourseSyncViewSet, basename="courses")
router.register(r"enrollments", StudentCourseEnrollmentViewSet, basename="enrollments")
router.register(r"logs", SyncLogViewSet, basename="sync-logs")
router.register(r"imports", ImportBatchViewSet, basename="imports")

urlpatterns = router.urls