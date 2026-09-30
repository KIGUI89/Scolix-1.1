import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.sync.models import AcademicSemester


class EvaluationCampaign(models.Model):
    """
    Campagne d'évaluation.
    Une campagne définit une période officielle pendant laquelle les étudiants
    peuvent évaluer les enseignants/cours d'un semestre donné.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Clôturée"
        CANCELLED = "CANCELLED", "Annulée"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=180)
    description = models.TextField(blank=True, null=True)

    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="evaluation_campaigns",
    )

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    is_deleted = models.BooleanField(default=False)

    # Marque l'envoi de la relance automatique à 24h de la clôture, pour ne
    # jamais la renvoyer en boucle tant que la campagne reste active.
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_campaigns",
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "campaigns_evaluation_campaigns"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["semester"]),
            models.Index(fields=["start_date", "end_date"]),
            models.Index(fields=["is_deleted"]),
        ]

    def clean(self):
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValidationError("La date de début doit être inférieure à la date de fin.")

        if self.semester and self.start_date and self.end_date:
            if self.start_date.date() < self.semester.start_date:
                raise ValidationError("La campagne ne peut pas commencer avant le début du semestre.")

            if self.end_date.date() > self.semester.end_date:
                raise ValidationError("La campagne ne peut pas finir après la fin du semestre.")

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_open(self):
        now = timezone.now()
        return self.status == self.Status.ACTIVE and self.start_date <= now <= self.end_date

    def __str__(self):
        return f"{self.title} - {self.status}"