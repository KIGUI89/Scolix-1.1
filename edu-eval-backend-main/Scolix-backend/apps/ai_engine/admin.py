from django.contrib import admin
from .models import ClusteringResult, BiasDetectionResult

@admin.register(ClusteringResult)
class ClusteringResultAdmin(admin.ModelAdmin):
    list_display = ["id", "k", "semester_id", "computed_at"]
    ordering = ["-computed_at"]

@admin.register(BiasDetectionResult)
class BiasDetectionResultAdmin(admin.ModelAdmin):
    list_display = ["id", "semester_id", "computed_at"]
    ordering = ["-computed_at"]
