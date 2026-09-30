from rest_framework import serializers

from apps.evaluations.serializers import CampaignCriteriaSerializer
from .models import EvaluationCampaign


class EvaluationCampaignSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    campaign_criteria = CampaignCriteriaSerializer(many=True, read_only=True)

    class Meta:
        model = EvaluationCampaign
        fields = [
            "id",
            "title",
            "description",
            "semester",
            "semester_name",
            "start_date",
            "end_date",
            "status",
            "is_open",
            "campaign_criteria",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "is_open",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        semester = attrs.get("semester", getattr(self.instance, "semester", None))

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                "end_date": "La date de fin doit être supérieure à la date de début."
            })

        if semester and start_date and end_date:
            if start_date.date() < semester.start_date:
                raise serializers.ValidationError({
                    "start_date": "La campagne ne peut pas commencer avant le début du semestre."
                })

            if end_date.date() > semester.end_date:
                raise serializers.ValidationError({
                    "end_date": "La campagne ne peut pas finir après la fin du semestre."
                })

        return attrs