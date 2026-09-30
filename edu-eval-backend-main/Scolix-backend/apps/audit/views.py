from rest_framework import filters
from rest_framework.viewsets import ReadOnlyModelViewSet
from apps.authentication.permissions import IsAdminOrDirector
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(ReadOnlyModelViewSet):
    """
    GET /api/audit/logs/       — Admin/Directeur
    GET /api/audit/logs/{id}/
    """
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrDirector]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__email", "action", "resource", "ip_address"]
    ordering_fields = ["timestamp", "action", "resource"]
    ordering = ["-timestamp"]
