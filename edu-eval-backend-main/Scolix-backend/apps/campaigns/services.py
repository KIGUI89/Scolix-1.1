from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import EvaluationCampaign

from apps.notifications.services import NotificationService


class CampaignService:
    """
    Service métier pour gérer le cycle de vie des campagnes.
    """

    @staticmethod
    @transaction.atomic
    def activate_campaign(campaign: EvaluationCampaign) -> EvaluationCampaign:
        if campaign.status not in (
            EvaluationCampaign.Status.DRAFT,
            EvaluationCampaign.Status.CLOSED,
        ):
            raise ValidationError("Seule une campagne en brouillon ou clôturée peut être activée.")

        now = timezone.now()

        if campaign.end_date <= now:
            raise ValidationError("Impossible d'activer une campagne déjà expirée.")

        campaign.status = EvaluationCampaign.Status.ACTIVE
        campaign.save(update_fields=["status", "updated_at"])

        notifications = NotificationService.notify_students_campaign_opened(campaign)
        # L'envoi effectif (email/SMS/push) ne doit démarrer qu'une fois cette
        # transaction validée, et se fait en arrière-plan pour ne jamais faire
        # attendre la réponse HTTP sur un envoi SMTP lent ou indisponible.
        transaction.on_commit(lambda: NotificationService.dispatch_pending_notifications(notifications))

        return campaign

    @staticmethod
    @transaction.atomic
    def close_campaign(campaign: EvaluationCampaign) -> EvaluationCampaign:
        if campaign.status not in [
            EvaluationCampaign.Status.ACTIVE,
            EvaluationCampaign.Status.DRAFT,
        ]:
            raise ValidationError("Cette campagne ne peut pas être clôturée.")

        campaign.status = EvaluationCampaign.Status.CLOSED
        campaign.save(update_fields=["status", "updated_at"])
        return campaign

    @staticmethod
    @transaction.atomic
    def cancel_campaign(campaign: EvaluationCampaign) -> EvaluationCampaign:
        if campaign.status == EvaluationCampaign.Status.CLOSED:
            raise ValidationError("Une campagne déjà clôturée ne peut pas être annulée.")

        campaign.status = EvaluationCampaign.Status.CANCELLED
        campaign.save(update_fields=["status", "updated_at"])
        return campaign

    @staticmethod
    def send_pending_reminders_if_due():
        """
        Auto-correction paresseuse (même principe que SemesterService.sync_statuses) :
        appelée à chaque lecture pertinente plutôt que par une tâche planifiée
        (aucune infrastructure cron/Celery dans ce projet). Relance automatiquement
        les étudiants n'ayant pas terminé une campagne dont la clôture approche
        (≤ 24h), une seule fois par campagne grâce à `reminder_sent_at`.
        """
        now = timezone.now()
        due_campaigns = EvaluationCampaign.objects.filter(
            status=EvaluationCampaign.Status.ACTIVE,
            is_deleted=False,
            reminder_sent_at__isnull=True,
            end_date__lte=now + timedelta(hours=24),
            end_date__gt=now,
        )

        for campaign in due_campaigns:
            with transaction.atomic():
                notifications = NotificationService.notify_students_pending_campaign(campaign)
                campaign.reminder_sent_at = now
                campaign.save(update_fields=["reminder_sent_at"])
                transaction.on_commit(
                    lambda n=notifications: NotificationService.dispatch_pending_notifications(n)
                )

    @staticmethod
    @transaction.atomic
    def delete_campaign(campaign: EvaluationCampaign) -> None:
        """
        Suppression "douce" : la campagne disparaît de l'interface admin mais
        la ligne (et tout son historique de soumissions) reste en base.
        """
        campaign.is_deleted = True
        campaign.save(update_fields=["is_deleted", "updated_at"])