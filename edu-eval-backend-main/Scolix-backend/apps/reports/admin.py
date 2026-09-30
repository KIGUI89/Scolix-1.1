from django.contrib import admin
from .models import ReportRequest

@admin.register(ReportRequest)
class ReportRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "report_type", "format", "status", "requested_by", "created_at"]
    list_filter  = ["report_type", "format", "status"]
    ordering     = ["-created_at"]
