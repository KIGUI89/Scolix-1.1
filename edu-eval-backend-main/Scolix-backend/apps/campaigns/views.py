from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Avg, Count
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authentication.permissions import IsAdminOrDirector
from apps.evaluations.models import CampaignCriteria, EvaluationCriteria, EvaluationSubmission
from apps.evaluations.serializers import CampaignCriteriaSerializer, CampaignCriteriaSetSerializer
from .models import EvaluationCampaign
from .serializers import EvaluationCampaignSerializer
from .services import CampaignService


class EvaluationCampaignViewSet(viewsets.ModelViewSet):
    # is_deleted=True == campagne "supprimée" par l'admin : masquée de cette
    # interface uniquement, la ligne (et son historique) reste en base.
    queryset = EvaluationCampaign.objects.select_related(
        "semester",
        "created_by",
    ).prefetch_related("campaign_criteria__criteria").filter(is_deleted=False)
    serializer_class = EvaluationCampaignSerializer
    permission_classes = [IsAdminOrDirector]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "title",
        "description",
        "semester__name",
        "status",
    ]
    ordering_fields = [
        "title",
        "status",
        "start_date",
        "end_date",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_permissions(self):
        # La lecture des critères d'une campagne doit rester accessible à tout
        # utilisateur authentifié (un étudiant doit pouvoir lire la composition
        # de la campagne pour remplir son formulaire d'évaluation).
        if self.action == "criteria" and self.request.method == "GET":
            return [IsAuthenticated()]
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        # Auto-correction paresseuse : à chaque consultation de la liste des
        # campagnes par un admin, on relance au passage les étudiants dont une
        # campagne active approche de sa clôture (même principe que
        # SemesterService.sync_statuses pour les semestres).
        CampaignService.send_pending_reminders_if_due()
        return super().get_queryset()

    def perform_create(self, serializer):
        try:
            serializer.save(created_by=self.request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    def perform_destroy(self, instance):
        try:
            CampaignService.delete_campaign(instance)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        campaign = self.get_object()

        try:
            campaign = CampaignService.activate_campaign(campaign)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            EvaluationCampaignSerializer(campaign).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        campaign = self.get_object()

        try:
            campaign = CampaignService.close_campaign(campaign)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            EvaluationCampaignSerializer(campaign).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "put"])
    def criteria(self, request, pk=None):
        campaign = self.get_object()

        if request.method == "GET":
            qs = CampaignCriteria.objects.filter(campaign=campaign).select_related("criteria")
            return Response(CampaignCriteriaSerializer(qs, many=True).data)

        input_serializer = CampaignCriteriaSetSerializer(data=request.data, many=True)
        input_serializer.is_valid(raise_exception=True)
        items = input_serializer.validated_data

        criteria_ids = [item["criteria"] for item in items]
        if len(criteria_ids) != len(set(criteria_ids)):
            return Response(
                {"detail": "Un critère ne peut pas être sélectionné plusieurs fois."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_ids = set(
            EvaluationCriteria.objects.filter(id__in=criteria_ids, is_active=True).values_list("id", flat=True)
        )
        if set(criteria_ids) != active_ids:
            return Response(
                {"detail": "Seuls les critères actifs peuvent être sélectionnés pour une campagne."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = sum((item["percentage"] for item in items), Decimal("0"))
        if total > Decimal("100"):
            return Response(
                {"detail": f"La somme des pourcentages ({total}%) dépasse 100 %. "
                            "Réajustez la répartition des critères sélectionnés."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            CampaignCriteria.objects.filter(campaign=campaign).delete()
            CampaignCriteria.objects.bulk_create([
                CampaignCriteria(campaign=campaign, criteria_id=item["criteria"], percentage=item["percentage"])
                for item in items
            ])

        qs = CampaignCriteria.objects.filter(campaign=campaign).select_related("criteria")
        return Response(CampaignCriteriaSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def teachers(self, request, pk=None):
        campaign = self.get_object()

        data = (
            EvaluationSubmission.objects.filter(
                campaign=campaign,
                status=EvaluationSubmission.Status.SUBMITTED,
            )
            .values("teacher__id", "teacher__first_name", "teacher__last_name")
            .annotate(submissions_count=Count("id"), avg_score=Avg("global_score"))
            .order_by("teacher__last_name", "teacher__first_name")
        )

        return Response([
            {
                "teacher_id":         str(d["teacher__id"]),
                "teacher_name":       f"{d['teacher__first_name']} {d['teacher__last_name']}",
                "submissions_count":  d["submissions_count"],
                "avg_score":          round(float(d["avg_score"]), 2) if d["avg_score"] is not None else None,
            }
            for d in data
        ])

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        campaign = self.get_object()

        try:
            campaign = CampaignService.cancel_campaign(campaign)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message if hasattr(exc, "message") else exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            EvaluationCampaignSerializer(campaign).data,
            status=status.HTTP_200_OK,
        )