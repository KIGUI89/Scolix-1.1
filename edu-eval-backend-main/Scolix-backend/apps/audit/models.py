import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Création"
        UPDATE = "UPDATE", "Modification"
        DELETE = "DELETE", "Suppression"
        LOGIN  = "LOGIN",  "Connexion"
        LOGOUT = "LOGOUT", "Déconnexion"
        EXPORT = "EXPORT", "Export"
        ACCESS = "ACCESS", "Accès"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_logs",
    )

    action      = models.CharField(max_length=20, choices=Action.choices)
    resource    = models.CharField(max_length=100)          # ex: "EvaluationSubmission"
    resource_id = models.CharField(max_length=100, blank=True, null=True)
    detail      = models.TextField(blank=True, null=True)   # info complémentaire
    ip_address  = models.GenericIPAddressField(blank=True, null=True)
    user_agent  = models.TextField(blank=True, null=True)
    timestamp   = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["action"]),
            models.Index(fields=["resource"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        actor = self.user.email if self.user else "anonyme"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor} — {self.action} {self.resource}"
