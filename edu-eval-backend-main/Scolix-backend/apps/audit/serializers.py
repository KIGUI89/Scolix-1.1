from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_email", "action",
            "resource", "resource_id", "detail",
            "ip_address", "timestamp",
        ]
        read_only_fields = fields
