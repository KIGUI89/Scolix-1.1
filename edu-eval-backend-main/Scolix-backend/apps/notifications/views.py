from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DeviceToken, Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        # Chaque utilisateur ne voit que ses propres notifications in-app : les
        # copies EMAIL/SMS/PUSH ne sont que des traces d'envoi, jamais « lues ».
        return Notification.objects.filter(
            recipient=self.request.user,
            channel=Notification.Channel.IN_APP,
        )

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.status = Notification.Status.READ
        notification.read_at = timezone.now()
        notification.save(update_fields=["status", "read_at"])

        return Response(
            {"detail": "Notification marquée comme lue."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"])
    def register_device(self, request):
        """POST /api/notifications/register_device/ {token, platform} —
        enregistre (ou réactive) le jeton FCM de l'appareil de l'utilisateur."""
        token = (request.data.get("token") or "").strip()
        if not token:
            return Response({"token": "Jeton requis."}, status=status.HTTP_400_BAD_REQUEST)
        DeviceToken.objects.update_or_create(
            token=token,
            defaults={
                "user": request.user,
                "platform": (request.data.get("platform") or "android")[:20],
                "is_active": True,
                "last_seen_at": timezone.now(),
            },
        )
        return Response({"detail": "Appareil enregistré."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def unregister_device(self, request):
        """POST /api/notifications/unregister_device/ {token} — désactive le
        jeton à la déconnexion (suppression logique)."""
        DeviceToken.objects.filter(
            token=(request.data.get("token") or "").strip(), user=request.user,
        ).update(is_active=False)
        return Response({"detail": "Appareil désenregistré."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(
            recipient=request.user,
        ).exclude(
            status=Notification.Status.READ,
        ).update(
            status=Notification.Status.READ,
            read_at=timezone.now(),
        )

        return Response(
            {"detail": "Toutes les notifications ont été marquées comme lues."},
            status=status.HTTP_200_OK,
        )