from rest_framework import status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.authentication.permissions import IsAdmin, IsAdminOrDirector
from apps.sync.models import TeacherSync
from .models import AttendanceRecord, AttendanceAlert
from .serializers import (AttendanceRecordSerializer, AttendanceRecordCreateSerializer,
                           JustifyAttendanceSerializer, AttendanceAlertSerializer)
from .services import AttendanceService


class TeacherAttendanceView(APIView):
    def get(self, request, teacher_id):
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile
                  and str(user.teacher_profile.id) == str(teacher_id))
        if not (user.role in ["ADMIN", "DIRECTOR"] or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = TeacherSync.objects.get(id=teacher_id)
        except TeacherSync.DoesNotExist:
            return Response({"detail": "Enseignant introuvable."}, status=status.HTTP_404_NOT_FOUND)

        period = request.query_params.get("period")
        qs = AttendanceRecord.objects.filter(teacher=teacher).select_related("course")
        if period:
            try:
                y, m = period.split("-")
                qs = qs.filter(scheduled_at__year=int(y), scheduled_at__month=int(m))
            except ValueError:
                return Response({"detail": "Format invalide (YYYY-MM)."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "teacher_id": str(teacher.id), "teacher_name": teacher.full_name,
            "period": period or "all",
            "stats": AttendanceService.compute_punctuality_rate(teacher, period),
            "records": AttendanceRecordSerializer(qs.order_by("-scheduled_at"), many=True).data,
        })


class AttendanceRecordViewSet(ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("teacher", "course").all()
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["teacher__first_name", "teacher__last_name", "course__code", "status"]
    ordering = ["-scheduled_at"]

    def get_serializer_class(self):
        return AttendanceRecordCreateSerializer if self.action == "create" else AttendanceRecordSerializer

    def perform_create(self, serializer):
        record = serializer.save()
        AttendanceService.check_and_create_alerts(record.teacher, record.scheduled_at.strftime("%Y-%m"))


class JustifyAttendanceView(APIView):
    def post(self, request):
        serializer = JustifyAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.validated_data["record_id"]
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile
                  and record.teacher_id == user.teacher_profile.id)
        if not (user.role == "ADMIN" or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        if record.status == AttendanceRecord.Status.ON_TIME:
            return Response({"detail": "Impossible de justifier un enregistrement 'À l'heure'."}, status=status.HTTP_400_BAD_REQUEST)
        record.justification = serializer.validated_data["justification"]
        if user.role == "ADMIN":
            record.is_justified = True
        record.save(update_fields=["justification", "is_justified", "updated_at"])
        return Response(AttendanceRecordSerializer(record).data)


class AttendanceAlertViewSet(ReadOnlyModelViewSet):
    queryset = AttendanceAlert.objects.select_related("teacher").all()
    serializer_class = AttendanceAlertSerializer
    permission_classes = [IsAdminOrDirector]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["teacher__first_name", "teacher__last_name", "alert_type", "status", "period"]
    ordering = ["-created_at"]
