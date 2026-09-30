from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import IsAdminOrDirector
from .models import (
    ClusteringResult, BiasDetectionResult, EvaluatorBiasResult, EvaluatorBiasConfig,
    TrainingCatalog,
)
from .services import (
    KMeansService, BiasDetectionService, EvaluatorBiasService, RecommendationService,
    TeacherPredictionService,
)


class ClusteringView(APIView):
    """
    GET  /api/ai/clustering/?semester_id=  — Lit le dernier clustering déjà entraîné (rapide, pas de recalcul).
    POST /api/ai/clustering/               — (Ré)entraîne un clustering K-Means et le stocke.
    Séparation entraînement/lecture demandée par le cahier des charges (le
    K-Means est coûteux, il ne doit pas être recalculé à chaque visite de page).
    """
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        qs = ClusteringResult.objects.all()
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        latest = qs.first()  # déjà trié par -computed_at (Meta.ordering)

        if not latest:
            return Response({"detail": "Aucun clustering entraîné pour ce périmètre."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"id": str(latest.id), "computed_at": latest.computed_at, **latest.clusters})

    def post(self, request):
        k           = int(request.data.get("k", 3))
        semester_id = request.data.get("semester_id")
        result      = KMeansService.run(k=k, semester_id=semester_id)

        saved = ClusteringResult.objects.create(
            semester_id=semester_id,
            k=k,
            clusters=result,
        )
        return Response({"id": str(saved.id), **result}, status=status.HTTP_201_CREATED)


class BiasDetectionView(APIView):
    """
    GET  /api/ai/bias/?semester_id=&teacher_id=  — Calcule à la volée, sans
         rien stocker (lecture ciblée, ex: depuis une fiche enseignant —
         un POST créerait un BiasDetectionResult à chaque visite de page).
    POST /api/ai/bias/  — Détection de biais z-score, avec sauvegarde du résultat.
    """
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        semester_id = request.query_params.get("semester_id")
        teacher_id = request.query_params.get("teacher_id")
        results = BiasDetectionService.run(semester_id=semester_id, teacher_id=teacher_id)
        return Response({"results": results})

    def post(self, request):
        semester_id = request.data.get("semester_id")
        results     = BiasDetectionService.run(semester_id=semester_id)

        saved = BiasDetectionResult.objects.create(
            semester_id=semester_id,
            results=results,
        )
        return Response({"id": str(saved.id), "results": results}, status=status.HTTP_201_CREATED)


class EvaluatorBiasView(APIView):
    """POST /api/ai/evaluator-bias/  — Détection de biais z-score par évaluateur"""
    permission_classes = [IsAdminOrDirector]

    def post(self, request):
        semester_id = request.data.get("semester_id")
        results     = EvaluatorBiasService.run(semester_id=semester_id)

        saved = EvaluatorBiasResult.objects.create(
            semester_id=semester_id,
            results=results,
        )
        return Response({"id": str(saved.id), "results": results}, status=status.HTTP_201_CREATED)


class EvaluatorBiasConfigView(APIView):
    """GET/PATCH /api/ai/evaluator-bias/config/"""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        cfg = EvaluatorBiasConfig.get_solo()
        return Response({"normalization_enabled": cfg.normalization_enabled})

    def patch(self, request):
        cfg = EvaluatorBiasConfig.get_solo()
        if "normalization_enabled" in request.data:
            cfg.normalization_enabled = bool(request.data["normalization_enabled"])
            cfg.save()
        return Response({"normalization_enabled": cfg.normalization_enabled})


class RecommendationView(APIView):
    """GET /api/ai/recommendations/{teacher_id}/ — ADMIN/DIRECTOR peuvent
    consulter n'importe quel enseignant ; un TEACHER ne peut consulter que
    ses propres recommandations (même pattern self-service que teacher_views.py)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile and str(user.teacher_profile.id) == str(teacher_id))
        if not (user.role in ["ADMIN", "DIRECTOR"] or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)

        semester_id = request.query_params.get("semester_id")
        campaign_id = request.query_params.get("campaign_id")
        data        = RecommendationService.generate(teacher_id, semester_id, campaign_id)
        return Response(data)


def _serialize_prediction(prediction):
    return {
        "id":              str(prediction.id),
        "teacher_id":      str(prediction.teacher_id),
        "predicted_score": float(prediction.predicted_score) if prediction.predicted_score is not None else None,
        "slope":           float(prediction.slope) if prediction.slope is not None else None,
        "r_squared":       float(prediction.r_squared) if prediction.r_squared is not None else None,
        "data_points":     prediction.data_points,
        "status":          prediction.details.get("status", "insufficient_data"),
        "category_trends": prediction.details.get("category_trends", []),
        "computed_at":     prediction.computed_at,
    }


class TeacherPredictionView(APIView):
    """
    GET  /api/ai/predictions/{teacher_id}/  — Lit la dernière prédiction stockée
         (déclenche un premier calcul si aucune n'existe encore, pour éviter un écran vide).
    """
    permission_classes = [IsAdminOrDirector]

    def get(self, request, teacher_id):
        prediction = TeacherPredictionService.latest(teacher_id)
        if prediction is None:
            prediction = TeacherPredictionService.train(teacher_id)
        return Response(_serialize_prediction(prediction))


class TeacherPredictionRetrainView(APIView):
    """POST /api/ai/predictions/{teacher_id}/retrain/  — Relance manuelle à la demande."""
    permission_classes = [IsAdminOrDirector]

    def post(self, request, teacher_id):
        prediction = TeacherPredictionService.train(teacher_id)
        return Response(_serialize_prediction(prediction), status=status.HTTP_201_CREATED)


class TrainingCatalogView(APIView):
    """GET /api/ai/training-catalog/  — Liste du catalogue de formations actif."""
    permission_classes = [IsAdminOrDirector]

    def get(self, request):
        catalog = TrainingCatalog.objects.filter(is_active=True)
        return Response([
            {
                "id":          str(t.id),
                "title":       t.title,
                "description": t.description,
                "category":    t.category,
                "provider":    t.provider,
                "url":         t.url,
            }
            for t in catalog
        ])
