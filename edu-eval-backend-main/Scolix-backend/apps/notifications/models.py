import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    class NotifType(models.TextChoices):
        CAMPAIGN_OPEN = "CAMPAIGN_OPEN", "Campagne ouverte"
        CAMPAIGN_REMINDER = "CAMPAIGN_REMINDER", "Rappel d'évaluation"
        CAMPAIGN_CLOSED = "CAMPAIGN_CLOSED", "Campagne clôturée"
        ATTENDANCE_ALERT = "ATTENDANCE_ALERT", "Alerte ponctualité"
        SCORE_PUBLISHED = "SCORE_PUBLISHED", "Scores publiés"
        REPORT_NEW = "REPORT_NEW", "Nouveau signalement"
        REPORT_RESPONSE = "REPORT_RESPONSE", "Réponse à un signalement"
        TEACHER_WARNING = "TEACHER_WARNING", "Mise en garde"
        SYSTEM = "SYSTEM", "Système"

    class Channel(models.TextChoices):
        IN_APP = "IN_APP", "In-App"
        EMAIL = "EMAIL", "Email"
        SMS = "SMS", "SMS"
        PUSH = "PUSH", "Push"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        SENT = "SENT", "Envoyée"
        FAILED = "FAILED", "Échouée"
        READ = "READ", "Lue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notif_type = models.CharField(max_length=30, choices=NotifType.choices)
    channel = models.CharField(max_length=20, choices=Channel.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    title = models.CharField(max_length=200)
    message = models.TextField()

    recipient_email = models.EmailField(blank=True, null=True)
    recipient_phone = models.CharField(max_length=30, blank=True, null=True)

    related_resource = models.CharField(max_length=100, blank=True, null=True)
    related_resource_id = models.CharField(max_length=100, blank=True, null=True)

    payload = models.JSONField(default=dict, blank=True)

    sent_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient"]),
            models.Index(fields=["status"]),
            models.Index(fields=["notif_type"]),
            models.Index(fields=["channel"]),
        ]

    def __str__(self):
        return f"[{self.notif_type}] → {self.recipient.email} ({self.channel}/{self.status})"


class DeviceToken(models.Model):
    """Jeton Firebase Cloud Messaging d'un appareil mobile, enregistré par
    l'application à la connexion. Désactivé (jamais supprimé) à la
    déconnexion ou quand FCM le déclare invalide."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_tokens",
    )
    token = models.CharField(max_length=512, unique=True)
    platform = models.CharField(max_length=20, default="android")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notifications_device_tokens"
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        return f"{self.user.email} ({self.platform})"