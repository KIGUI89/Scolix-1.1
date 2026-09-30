import csv
import io

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.authentication.permissions import IsAdminOrDirector

from . import import_services as svc
from .models import ImportBatch

ENTITY_LABELS = dict(ImportBatch.EntityType.choices)


def _batch_summary(batch: ImportBatch) -> dict:
    return {
        "id": str(batch.id),
        "entity_type": batch.entity_type,
        "entity_label": ENTITY_LABELS.get(batch.entity_type, batch.entity_type),
        "original_filename": batch.original_filename,
        "status": batch.status,
        "row_count": len(batch.rows),
        "headers": batch.headers,
        "sample_rows": batch.rows[:5],
        "mapping": batch.mapping,
        "target_fields": {
            "required": svc.REQUIRED_FIELDS[batch.entity_type],
            "optional": svc.OPTIONAL_FIELDS[batch.entity_type],
        },
        "validation": batch.validation,
        "created_at": batch.created_at,
        "committed_at": batch.committed_at,
    }


class ImportBatchViewSet(viewsets.ViewSet):
    """
    Assistant d'import manuel de données de référence (enseignants, étudiants,
    cours, inscriptions) — voir apps.sync.import_services pour la logique.
    """
    permission_classes = [IsAdminOrDirector]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request):
        entity_type = request.data.get("entity_type")
        if entity_type not in ImportBatch.EntityType.values:
            return Response({"detail": "entity_type invalide."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "Aucun fichier fourni."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            headers, rows = svc.parse_uploaded_file(uploaded_file)
        except svc.ImportError_ as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        suggested = svc.suggest_mapping(entity_type, headers)
        mapping = {h: suggested[h]["field"] for h in headers}

        batch = ImportBatch.objects.create(
            entity_type=entity_type,
            original_filename=uploaded_file.name,
            headers=headers,
            rows=rows,
            mapping=mapping,
            created_by=request.user if request.user.is_authenticated else None,
        )
        payload = _batch_summary(batch)
        payload["mapping_confidence"] = {h: suggested[h]["confidence"] for h in headers}
        return Response(payload, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        batch = self._get_batch(request, pk)
        if batch is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(_batch_summary(batch))

    def destroy(self, request, pk=None):
        batch = self._get_batch(request, pk)
        if batch is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if batch.status == ImportBatch.Status.COMMITTED:
            return Response({"detail": "Un import déjà terminé ne peut pas être annulé."}, status=status.HTTP_400_BAD_REQUEST)
        batch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        batch = self._get_batch(request, pk)
        if batch is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if batch.status == ImportBatch.Status.COMMITTED:
            return Response({"detail": "Cet import est déjà terminé."}, status=status.HTTP_400_BAD_REQUEST)

        mapping = request.data.get("mapping")
        if not isinstance(mapping, dict):
            return Response({"detail": "mapping requis (objet {colonne: champ})."}, status=status.HTTP_400_BAD_REQUEST)

        validation = svc.validate_rows(batch.entity_type, batch.rows, mapping)
        batch.mapping = mapping
        batch.validation = validation
        batch.status = ImportBatch.Status.VALIDATED
        batch.save(update_fields=["mapping", "validation", "status"])
        return Response(_batch_summary(batch))

    @action(detail=True, methods=["post"])
    def commit(self, request, pk=None):
        batch = self._get_batch(request, pk)
        if batch is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if batch.status == ImportBatch.Status.COMMITTED:
            return Response({"detail": "Cet import est déjà terminé."}, status=status.HTTP_400_BAD_REQUEST)
        if batch.status != ImportBatch.Status.VALIDATED:
            return Response({"detail": "Validez le mapping avant de lancer l'import."}, status=status.HTTP_400_BAD_REQUEST)

        ignore_errors = bool(request.data.get("ignore_errors"))
        try:
            result = svc.commit_batch(batch, ignore_errors=ignore_errors, user=request.user)
        except svc.ImportError_ as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({**result, "batch": _batch_summary(batch)})

    @action(detail=False, methods=["get"])
    def template(self, request):
        entity_type = request.query_params.get("entity_type")
        if entity_type not in ImportBatch.EntityType.values:
            return Response({"detail": "entity_type invalide."}, status=status.HTTP_400_BAD_REQUEST)

        fields = svc.target_fields(entity_type)
        buf = io.StringIO()
        csv.writer(buf).writerow(fields)

        response = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="modele-{entity_type.lower()}.csv"'
        return response

    def _get_batch(self, request, pk):
        try:
            return ImportBatch.objects.get(pk=pk)
        except (ImportBatch.DoesNotExist, ValueError, TypeError):
            return None
