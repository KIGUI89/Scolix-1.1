from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notif_type",
            "channel",
            "status",
            "title",
            "message",
            "related_resource",
            "related_resource_id",
            "payload",
            "sent_at",
            "read_at",
            "created_at",
        ]