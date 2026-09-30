from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action", "resource", "resource_id", "ip_address"]
    list_filter = ["action", "resource"]
    search_fields = ["user__email", "resource", "ip_address"]
    ordering = ["-timestamp"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]
