import uuid
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from apps.sync.models import TeacherSync, CourseSync


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        ON_TIME = "ON_TIME", "À l'heure"
        LATE    = "LATE",    "En retard"
        ABSENT  = "ABSENT",  "Absent"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher      = models.ForeignKey(TeacherSync, on_delete=models.CASCADE, related_name="attendance_records")
    course       = models.ForeignKey(CourseSync,  on_delete=models.CASCADE, related_name="attendance_records")
    scheduled_at = models.DateTimeField()
    actual_at    = models.DateTimeField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.ON_TIME)
    delay_minutes = models.PositiveIntegerField(default=0)
    justification = models.TextField(blank=True, null=True)
    is_justified  = models.BooleanField(default=False)
    created_at    = models.DateTimeField(default=timezone.now)
    updated_at    = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "attendance_records"
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["teacher"]),
            models.Index(fields=["course"]),
            models.Index(fields=["status"]),
            models.Index(fields=["scheduled_at"]),
        ]

    def clean(self):
        if self.status == self.Status.ABSENT and self.actual_at:
            raise ValidationError("Un enseignant absent ne peut pas avoir d'heure d'arrivée.")
        if self.status == self.Status.ON_TIME and self.delay_minutes > 0:
            raise ValidationError("Un enseignant à l'heure ne peut pas avoir de retard.")
        if self.status == self.Status.LATE:
            if not self.actual_at:
                raise ValidationError("Un enseignant en retard doit avoir une heure d'arrivée.")
            if self.actual_at <= self.scheduled_at:
                raise ValidationError("L'heure d'arrivée doit être après l'heure prévue.")

    def save(self, *args, **kwargs):
        if self.status == self.Status.LATE and self.actual_at and self.scheduled_at:
            delta = self.actual_at - self.scheduled_at
            self.delay_minutes = max(0, int(delta.total_seconds() // 60))
        else:
            self.delay_minutes = 0
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.teacher.full_name} — {self.course.code} — {self.status}"


class AttendanceAlert(models.Model):
    class AlertType(models.TextChoices):
        LATE_THRESHOLD    = "LATE_THRESHOLD",    "Seuil de retards dépassé"
        ABSENCE_THRESHOLD = "ABSENCE_THRESHOLD", "Seuil d'absences dépassé"

    class AlertStatus(models.TextChoices):
        PENDING  = "PENDING",  "En attente"
        SENT     = "SENT",     "Envoyée"
        RESOLVED = "RESOLVED", "Résolue"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher    = models.ForeignKey(TeacherSync, on_delete=models.CASCADE, related_name="attendance_alerts")
    alert_type = models.CharField(max_length=30, choices=AlertType.choices)
    status     = models.CharField(max_length=20, choices=AlertStatus.choices, default=AlertStatus.PENDING)
    period     = models.CharField(max_length=10)
    count      = models.PositiveIntegerField(default=0)
    message    = models.TextField(blank=True, null=True)
    created_at  = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "attendance_alerts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher"]),
            models.Index(fields=["status"]),
            models.Index(fields=["period"]),
        ]

    def __str__(self):
        return f"Alerte {self.alert_type} — {self.teacher.full_name} — {self.period}"
