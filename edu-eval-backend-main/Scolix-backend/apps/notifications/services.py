import logging
import threading

from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import User
from apps.notifications.models import DeviceToken, Notification
from apps.sync.models import StudentCourseEnrollment

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def create_notification(
        *,
        recipient,
        notif_type,
        channel,
        title,
        message,
        related_resource=None,
        related_resource_id=None,
        payload=None,
    ):
        return Notification.objects.create(
            recipient=recipient,
            notif_type=notif_type,
            channel=channel,
            title=title,
            message=message,
            recipient_email=recipient.email,
            recipient_phone=getattr(recipient.student_profile, "phone", None)
            if recipient.role == User.Role.STUDENT and recipient.student_profile
            else None,
            related_resource=related_resource,
            related_resource_id=related_resource_id,
            payload=payload or {},
            status=Notification.Status.PENDING,
        )

    @staticmethod
    def _send_push(notification):
        """Envoi réel par FCM à tous les appareils actifs du destinataire.
        Lève une exception (→ statut FAILED) si FCM n'est pas configuré, si le
        destinataire n'a aucun appareil enregistré, ou si aucun envoi n'aboutit."""
        from . import fcm

        tokens = list(DeviceToken.objects.filter(user=notification.recipient, is_active=True))
        if not tokens:
            raise RuntimeError("Aucun appareil enregistré pour ce destinataire.")

        data = {
            "notification_id": notification.id,
            "notif_type": notification.notif_type,
            "related_resource": notification.related_resource or "",
            "related_resource_id": notification.related_resource_id or "",
        }
        delivered = 0
        for device in tokens:
            try:
                fcm.send_to_token(device.token, title=notification.title, body=notification.message, data=data)
                delivered += 1
            except fcm.FcmInvalidToken:
                device.is_active = False
                device.save(update_fields=["is_active"])
        if not delivered:
            raise RuntimeError("Aucun appareil n'a pu recevoir la notification.")

    @staticmethod
    def send_notification(notification):
        try:
            if notification.channel == Notification.Channel.EMAIL:
                send_mail(
                    subject=notification.title,
                    message=notification.message,
                    from_email=None,
                    recipient_list=[notification.recipient_email],
                    fail_silently=False,
                )

            elif notification.channel == Notification.Channel.SMS:
                # MVP : simulation SMS
                pass

            elif notification.channel == Notification.Channel.PUSH:
                NotificationService._send_push(notification)

            notification.status = Notification.Status.SENT
            notification.sent_at = timezone.now()
            notification.save(update_fields=["status", "sent_at"])
            return notification

        except Exception as exc:
            logger.warning("Échec d'envoi %s (%s) : %s", notification.id, notification.channel, exc)
            notification.status = Notification.Status.FAILED
            notification.save(update_fields=["status"])
            return notification

    @staticmethod
    @transaction.atomic
    def notify_students_campaign_opened(campaign):
        enrollments = StudentCourseEnrollment.objects.select_related(
            "student",
            "course",
            "course__teacher",
        ).prefetch_related("course__secondary_teachers").filter(
            semester=campaign.semester,
            is_active=True,
            student__is_active=True,
        )

        notifications = []

        for enrollment in enrollments:
            student_user = User.objects.filter(
                role=User.Role.STUDENT,
                student_profile=enrollment.student,
                is_active=True,
            ).first()

            if not student_user:
                continue

            teacher_names = [enrollment.course.teacher.full_name] + [
                t.full_name for t in enrollment.course.secondary_teachers.all()
            ]

            title = "Nouvelle évaluation disponible"
            message = (
                f"Bonjour {enrollment.student.full_name},\n\n"
                f"Une nouvelle évaluation est disponible pour le cours "
                f"{enrollment.course.code} - {enrollment.course.name}, "
                f"enseigné par {', '.join(teacher_names)}.\n\n"
                f"Connectez-vous à Edu-Eval pour donner votre avis."
            )

            payload = {
                "campaign_id": str(campaign.id),
                "campaign_title": campaign.title,
                "course_id": str(enrollment.course.id),
                "course_code": enrollment.course.code,
                "course_name": enrollment.course.name,
                "teacher_name": enrollment.course.teacher.full_name,
                "teacher_names": teacher_names,
            }

            for channel in [
                Notification.Channel.IN_APP,
                Notification.Channel.EMAIL,
                Notification.Channel.SMS,
                Notification.Channel.PUSH,
            ]:
                notification = NotificationService.create_notification(
                    recipient=student_user,
                    notif_type=Notification.NotifType.CAMPAIGN_OPEN,
                    channel=channel,
                    title=title,
                    message=message,
                    related_resource="campaign",
                    related_resource_id=str(campaign.id),
                    payload=payload,
                )

                notifications.append(notification)

        return notifications

    @staticmethod
    def notify_students_pending_campaign(campaign, student_ids=None):
        """
        Relance les étudiants n'ayant pas encore évalué la totalité des
        professeurs de `campaign`. Si `student_ids` est fourni, ne cible que
        ces étudiants (relance manuelle) ; sinon, tous les étudiants non
        terminés de cette campagne (relance automatique à 24h de la clôture).
        """
        from apps.analytics.services import AnalyticsService

        pending = [
            entry for entry in AnalyticsService.student_completion(campaign_id=campaign.id)
            if not entry["completed"]
        ]
        if student_ids is not None:
            student_ids = {str(sid) for sid in student_ids}
            pending = [entry for entry in pending if entry["student_id"] in student_ids]

        notifications = []

        for entry in pending:
            student_user = User.objects.filter(
                role=User.Role.STUDENT,
                student_profile_id=entry["student_id"],
                is_active=True,
            ).first()

            if not student_user:
                continue

            remaining = entry["total_courses"] - entry["submitted_courses"]
            title = "Rappel : évaluation à compléter"
            message = (
                f"Bonjour {entry['student_name']},\n\n"
                f"Il vous reste {remaining} enseignant{'s' if remaining > 1 else ''} à évaluer dans le cadre "
                f"de la campagne « {campaign.title} », qui se clôture le "
                f"{campaign.end_date.strftime('%d/%m/%Y à %H:%M')}.\n\n"
                f"Connectez-vous à Edu-Eval pour finaliser votre évaluation."
            )

            payload = {
                "campaign_id": str(campaign.id),
                "campaign_title": campaign.title,
                "remaining_courses": remaining,
            }

            for channel in [
                Notification.Channel.IN_APP,
                Notification.Channel.EMAIL,
                Notification.Channel.SMS,
                Notification.Channel.PUSH,
            ]:
                notification = NotificationService.create_notification(
                    recipient=student_user,
                    notif_type=Notification.NotifType.CAMPAIGN_REMINDER,
                    channel=channel,
                    title=title,
                    message=message,
                    related_resource="campaign",
                    related_resource_id=str(campaign.id),
                    payload=payload,
                )
                notifications.append(notification)

        return notifications

    @staticmethod
    def notify_admins_new_report(report):
        """Un nouveau signalement d'étudiant notifie tous les administrateurs."""
        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
        return [
            NotificationService.create_notification(
                recipient=admin,
                notif_type=Notification.NotifType.REPORT_NEW,
                channel=Notification.Channel.IN_APP,
                title="Nouveau signalement",
                message=f"Signalement « {report.title} » concernant {report.teacher.full_name}.",
                related_resource="teacher_report",
                related_resource_id=str(report.id),
                payload={"report_id": str(report.id)},
            )
            for admin in admins
        ]

    @staticmethod
    def notify_student_report_response(report):
        """La réponse de l'administration notifie l'étudiant auteur du signalement."""
        return NotificationService.create_notification(
            recipient=report.student,
            notif_type=Notification.NotifType.REPORT_RESPONSE,
            channel=Notification.Channel.IN_APP,
            title="Réponse à votre signalement",
            message=f"L'administration a répondu à votre signalement « {report.title} » : {report.admin_response}",
            related_resource="teacher_report",
            related_resource_id=str(report.id),
            payload={"report_id": str(report.id)},
        )

    @staticmethod
    def notify_teacher_warning(report):
        """La mise en garde notifie le compte de l'enseignant concerné, sans
        révéler l'identité de l'étudiant. Renvoie None si l'enseignant n'a pas
        de compte actif sur la plateforme."""
        teacher_user = User.objects.filter(
            role=User.Role.TEACHER, teacher_profile=report.teacher, is_active=True,
        ).first()
        if not teacher_user:
            return None
        return NotificationService.create_notification(
            recipient=teacher_user,
            notif_type=Notification.NotifType.TEACHER_WARNING,
            channel=Notification.Channel.IN_APP,
            title="Mise en garde de l'administration",
            message=report.teacher_warning,
            related_resource="teacher_report",
            related_resource_id=str(report.id),
            payload={},
        )

    @staticmethod
    def dispatch_pending_notifications(notifications):
        """
        Envoie réellement les notifications email/SMS/push, en arrière-plan.

        L'envoi (SMTP en particulier) peut être lent ou momentanément
        indisponible ; il ne doit jamais bloquer la requête HTTP qui a
        déclenché la création des notifications (ex : activation d'une
        campagne), sous peine de dépasser le délai d'attente du client.
        Appeler via `transaction.on_commit(...)` pour garantir que les
        notifications sont bien visibles en base avant l'envoi.
        """
        to_send_ids = [
            n.id for n in notifications
            if n.channel in (
                Notification.Channel.EMAIL,
                Notification.Channel.SMS,
                Notification.Channel.PUSH,
            )
        ]
        if not to_send_ids:
            return

        def _send_all():
            for notification in Notification.objects.filter(id__in=to_send_ids):
                NotificationService.send_notification(notification)

        threading.Thread(target=_send_all, daemon=True).start()