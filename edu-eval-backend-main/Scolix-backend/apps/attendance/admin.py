from django.contrib import admin
from .models import AttendanceRecord, AttendanceAlert

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ["teacher", "course", "scheduled_at", "status", "delay_minutes", "is_justified"]
    list_filter  = ["status", "is_justified"]
    search_fields = ["teacher__first_name", "teacher__last_name", "course__code"]

@admin.register(AttendanceAlert)
class AttendanceAlertAdmin(admin.ModelAdmin):
    list_display = ["teacher", "alert_type", "status", "period", "count", "created_at"]
    list_filter  = ["alert_type", "status"]
