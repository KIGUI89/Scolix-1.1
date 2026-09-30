from rest_framework import serializers
from .models import AttendanceRecord, AttendanceAlert


class AttendanceRecordSerializer(serializers.ModelSerializer):
    teacher_name     = serializers.CharField(source="teacher.full_name", read_only=True)
    teacher_matricule = serializers.CharField(source="teacher.matricule", read_only=True)
    course_code      = serializers.CharField(source="course.code", read_only=True)
    course_name      = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model  = AttendanceRecord
        fields = ["id", "teacher", "teacher_name", "teacher_matricule", "course", "course_code",
                  "course_name", "scheduled_at", "actual_at", "status", "delay_minutes",
                  "justification", "is_justified", "created_at", "updated_at"]
        read_only_fields = ["id", "delay_minutes", "created_at", "updated_at"]


class AttendanceRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AttendanceRecord
        fields = ["teacher", "course", "scheduled_at", "actual_at", "status", "justification"]

    def validate(self, attrs):
        s, actual, scheduled = attrs.get("status"), attrs.get("actual_at"), attrs.get("scheduled_at")
        if s == AttendanceRecord.Status.LATE:
            if not actual:
                raise serializers.ValidationError({"actual_at": "Requise pour un retard."})
            if actual <= scheduled:
                raise serializers.ValidationError({"actual_at": "Doit être après l'heure prévue."})
        if s == AttendanceRecord.Status.ABSENT and actual:
            raise serializers.ValidationError({"actual_at": "Absent ne peut pas avoir d'heure d'arrivée."})
        return attrs


class JustifyAttendanceSerializer(serializers.Serializer):
    record_id     = serializers.UUIDField()
    justification = serializers.CharField(min_length=10)

    def validate_record_id(self, value):
        try:
            return AttendanceRecord.objects.get(id=value)
        except AttendanceRecord.DoesNotExist:
            raise serializers.ValidationError("Enregistrement introuvable.")


class AttendanceAlertSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)

    class Meta:
        model  = AttendanceAlert
        fields = ["id", "teacher", "teacher_name", "alert_type", "status", "period",
                  "count", "message", "created_at", "resolved_at"]
        read_only_fields = ["id", "created_at"]
