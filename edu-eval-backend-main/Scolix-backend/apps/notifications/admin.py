from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "notif_type", "channel", "status", "title", "created_at"]
    list_filter = ["notif_type", "channel", "status"]
    search_fields = ["recipient__email", "title"]
    ordering = ["-created_at"]
