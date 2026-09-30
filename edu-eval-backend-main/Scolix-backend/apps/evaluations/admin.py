from django.contrib import admin

from .models import EvaluationCriteria, CampaignCriteria, EvaluationSubmission, EvaluationResponse


@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "version",
        "is_active",
        "created_at",
    )
    list_filter = ("category", "is_active", "version")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(CampaignCriteria)
class CampaignCriteriaAdmin(admin.ModelAdmin):
    list_display = ("campaign", "criteria", "percentage")
    list_filter = ("campaign",)
    search_fields = ("campaign__title", "criteria__name")
    readonly_fields = ("created_at",)


class EvaluationResponseInline(admin.TabularInline):
    model = EvaluationResponse
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(EvaluationSubmission)
class EvaluationSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "campaign",
        "course",
        "student",
        "status",
        "global_score",
        "submitted_at",
    )
    list_filter = ("campaign", "status", "course")
    search_fields = ("student__email", "course__code", "course__name")
    readonly_fields = ("submitted_at", "created_at", "updated_at")
    inlines = [EvaluationResponseInline]


@admin.register(EvaluationResponse)
class EvaluationResponseAdmin(admin.ModelAdmin):
    list_display = ("submission", "criteria", "score", "created_at")
    list_filter = ("criteria", "score")
    search_fields = ("submission__student__email", "criteria__name")
    readonly_fields = ("created_at",)