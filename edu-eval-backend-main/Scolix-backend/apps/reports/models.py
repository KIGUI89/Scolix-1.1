import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class ReportRequest(models.Model):
    class ReportType(models.TextChoices):
        TEACHER_SUMMARY  = "TEACHER_SUMMARY",  "Rapport enseignant"
        CAMPAIGN_RESULTS = "CAMPAIGN_RESULTS", "Résultats campagne"
        ATTENDANCE       = "ATTENDANCE",       "Rapport présences"
        RANKING          = "RANKING",          "Classement enseignants"

    class Format(models.TextChoices):
        PDF   = "PDF",   "PDF"
        EXCEL = "EXCEL", "Excel"
        CSV   = "CSV",   "CSV"

    class Status(models.TextChoices):
        PENDING    = "PENDING",    "En attente"
        GENERATING = "GENERATING", "En génération"
        DONE       = "DONE",       "Terminé"
        FAILED     = "FAILED",     "Échoué"

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="report_requests")
    report_type  = models.CharField(max_length=30, choices=ReportType.choices)
    format       = models.CharField(max_length=10, choices=Format.choices, default=Format.PDF)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    params       = models.JSONField(default=dict, blank=True)   # ex: {"semester_id": "..."}
    error        = models.TextField(blank=True, null=True)
    created_at   = models.DateTimeField(default=timezone.now)
    done_at      = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "report_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.report_type} ({self.format}) — {self.status}"
