"""
Algorithmes IA en Python pur (pas de numpy/sklearn dans requirements.txt).
- K-Means simplifié
- Détection de biais par z-score
- Recommandations basées sur les scores
"""
import math
import random
from collections import defaultdict

from django.db.models import Avg, Count

from apps.analytics.models import ClassificationConfig
from apps.evaluations.models import EvaluationCriteria, EvaluationSubmission, EvaluationResponse
from apps.sync.models import TeacherSync
from .models import EvaluatorBiasConfig, TrainingCatalog


# ── Helpers statistiques ───────────────────────────────────────────────────────

def _mean(values):
    return sum(values) / len(values) if values else 0.0

def _std(values):
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    variance = sum((x - m) ** 2 for x in values) / len(values)
    return math.sqrt(variance)

def _distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def _ols(points):
    """
    Régression linéaire simple (moindres carrés, formule fermée), fonction
    pure sans accès base — testable indépendamment avec des points
    synthétiques. `points` = [(x, y), ...], au moins 2 points requis.
    Retourne None si le calcul n'est pas possible (points insuffisants ou
    tous les x identiques).
    """
    n = len(points)
    if n < 2:
        return None

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x_mean, y_mean = _mean(xs), _mean(ys)

    ss_xx = sum((x - x_mean) ** 2 for x in xs)
    if ss_xx == 0:
        return None

    ss_xy = sum((x - x_mean) * (y - y_mean) for x, y in points)
    slope = ss_xy / ss_xx
    intercept = y_mean - slope * x_mean

    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    if ss_tot == 0:
        r_squared = 1.0
    else:
        ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in points)
        r_squared = 1 - ss_res / ss_tot

    return {"slope": slope, "intercept": intercept, "r_squared": r_squared}


# ── K-Means ────────────────────────────────────────────────────────────────────

class KMeansService:

    CATEGORIES = ["PEDAGOGY", "CONTENT", "BEHAVIOR", "AVAILABILITY", "ORGANIZATION"]
    CATEGORY_LABELS = {
        "PEDAGOGY":     "Pédagogue",
        "ORGANIZATION": "Méthodique",
        "CONTENT":      "Expert de contenu",
        "AVAILABILITY": "Disponible et à l'écoute",
        "BEHAVIOR":     "Relationnel",
    }

    @staticmethod
    def _get_teacher_vectors(semester_id=None):
        """
        Construit un vecteur [avg_PEDAGOGY, avg_CONTENT, avg_BEHAVIOR,
        avg_AVAILABILITY, avg_ORGANIZATION] (0-10) par enseignant, pour
        produire des profils qualitatifs plutôt qu'un simple classement par
        score. Le score global (0-100) est conservé séparément, pour
        l'affichage uniquement — il n'entre pas dans le clustering.
        """
        response_qs = EvaluationResponse.objects.filter(
            submission__status=EvaluationSubmission.Status.SUBMITTED
        )
        submission_qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            response_qs = response_qs.filter(submission__campaign__semester_id=semester_id)
            submission_qs = submission_qs.filter(campaign__semester_id=semester_id)

        category_rows = (
            response_qs.values(
                "submission__teacher__id",
                "submission__teacher__first_name",
                "submission__teacher__last_name",
                "criteria__category",
            )
            .annotate(avg_score=Avg("score"))
        )

        per_teacher = {}
        for r in category_rows:
            tid = str(r["submission__teacher__id"])
            entry = per_teacher.setdefault(tid, {
                "teacher_name": f"{r['submission__teacher__first_name']} "
                                 f"{r['submission__teacher__last_name']}",
                "categories": {},
            })
            entry["categories"][r["criteria__category"]] = float(r["avg_score"])

        global_rows = (
            submission_qs.values("teacher__id")
            .annotate(avg_score=Avg("global_score"))
        )
        global_by_teacher = {str(r["teacher__id"]): float(r["avg_score"]) for r in global_rows}

        vectors = []
        for tid, entry in per_teacher.items():
            vector = [entry["categories"].get(cat, 0.0) for cat in KMeansService.CATEGORIES]
            vectors.append({
                "teacher_id":    tid,
                "teacher_name":  entry["teacher_name"],
                "vector":        vector,
                "global_score":  global_by_teacher.get(tid, 0.0),
            })
        return vectors

    @staticmethod
    def run(k=4, max_iter=100, semester_id=None):
        vectors = KMeansService._get_teacher_vectors(semester_id)
        if not vectors:
            return {"k": 0, "clusters": []}
        if len(vectors) < k:
            k = max(1, len(vectors))

        # Init centroids aléatoires
        random.seed(42)
        centroids = [v["vector"][:] for v in random.sample(vectors, k)]

        assignments = [0] * len(vectors)

        for _ in range(max_iter):
            # Assignation
            new_assignments = []
            for v in vectors:
                dists = [_distance(v["vector"], c) for c in centroids]
                new_assignments.append(dists.index(min(dists)))

            if new_assignments == assignments:
                break
            assignments = new_assignments

            # Mise à jour centroids
            for ci in range(k):
                members = [vectors[i]["vector"] for i, a in enumerate(assignments) if a == ci]
                if members:
                    centroids[ci] = [_mean([m[j] for m in members]) for j in range(len(members[0]))]

        # Construction du résultat
        clusters = defaultdict(list)
        for i, v in enumerate(vectors):
            clusters[assignments[i]].append(v)

        results = []
        for ci, members in clusters.items():
            avg_global_score = _mean([t["global_score"] for t in members])
            results.append({
                "cluster_id":       ci,
                "centroid":         [round(c, 2) for c in centroids[ci]],
                "avg_global_score": round(avg_global_score, 2),
                "label":            KMeansService._label(centroids[ci], avg_global_score),
                "teachers":         [
                    {"teacher_id": t["teacher_id"], "teacher_name": t["teacher_name"], "score": t["global_score"]}
                    for t in members
                ],
                "size":             len(members),
            })

        return {"k": k, "clusters": results}

    @staticmethod
    def _label(centroid, avg_global_score):
        """
        "À risque" prime sur tout le reste si le score global du groupe est
        sous le seuil "À accompagner" déjà configuré côté Analytics (réutilise
        ClassificationConfig). Sinon, la catégorie dominante du centroïde
        détermine un profil qualitatif (pédagogue, méthodique, ...).
        """
        cfg = ClassificationConfig.get_solo()
        if avg_global_score < float(cfg.progression_threshold):
            return "À risque"

        dominant_index = max(range(len(centroid)), key=lambda i: centroid[i])
        dominant_category = KMeansService.CATEGORIES[dominant_index]
        return KMeansService.CATEGORY_LABELS[dominant_category]


# ── Détection de biais (z-score) ───────────────────────────────────────────────

class BiasDetectionService:

    Z_THRESHOLD = 2.0   # |z| > 2 → outlier

    @staticmethod
    def run(semester_id=None, teacher_id=None):
        qs = EvaluationResponse.objects.filter(
            submission__status=EvaluationSubmission.Status.SUBMITTED
        )
        if semester_id:
            qs = qs.filter(submission__campaign__semester_id=semester_id)

        # Scores par critère — référentiel population, jamais restreint à un
        # enseignant : le z-score d'un enseignant se lit contre l'ensemble des
        # notes de ce critère, pas contre son seul sous-ensemble.
        criteria_scores = defaultdict(list)
        for r in qs.values("criteria__id", "criteria__name", "score"):
            criteria_scores[str(r["criteria__id"])].append({
                "name":  r["criteria__name"],
                "score": r["score"],
            })

        # Scores par enseignant + critère (restreint à teacher_id si fourni,
        # pour une lecture ciblée depuis la fiche enseignant).
        teacher_qs = qs.filter(submission__teacher_id=teacher_id) if teacher_id else qs
        teacher_criteria = (
            teacher_qs.values(
                "submission__teacher__id",
                "submission__teacher__first_name",
                "submission__teacher__last_name",
                "criteria__id",
                "criteria__name",
            )
            .annotate(avg_score=Avg("score"))
        )

        # Calcul z-score
        results = []
        for tc in teacher_criteria:
            cid = str(tc["criteria__id"])
            scores = [s["score"] for s in criteria_scores[cid]]
            m, s = _mean(scores), _std(scores)
            teacher_score = float(tc["avg_score"])
            z = (teacher_score - m) / s if s > 0 else 0.0

            results.append({
                "teacher_id":   str(tc["submission__teacher__id"]),
                "teacher_name": f"{tc['submission__teacher__first_name']} {tc['submission__teacher__last_name']}",
                "criteria_id":  cid,
                "criteria_name": tc["criteria__name"],
                "avg_score":    round(teacher_score, 2),
                "z_score":      round(z, 3),
                "is_outlier":   abs(z) > BiasDetectionService.Z_THRESHOLD,
                "direction":    "above" if z > 0 else "below",
            })

        return sorted(results, key=lambda x: abs(x["z_score"]), reverse=True)


class EvaluatorBiasService:
    """
    Détection des étudiants évaluateurs systématiquement trop sévères ou trop
    indulgents : z-score de la moyenne des notes qu'ils ont attribuées par
    rapport à la moyenne générale de toutes les notes attribuées.
    """

    Z_THRESHOLD = 2.0   # même seuil que BiasDetectionService, pour cohérence

    @staticmethod
    def run(semester_id=None):
        qs = EvaluationResponse.objects.filter(
            submission__status=EvaluationSubmission.Status.SUBMITTED
        )
        if semester_id:
            qs = qs.filter(submission__campaign__semester_id=semester_id)

        population_scores = list(qs.values_list("score", flat=True))
        pop_mean, pop_std = _mean(population_scores), _std(population_scores)

        evaluators = (
            qs.values(
                "submission__student__id",
                "submission__student__student_profile__first_name",
                "submission__student__student_profile__last_name",
                "submission__student__student_profile__student_code",
            )
            .annotate(avg_score=Avg("score"), submissions_count=Count("submission", distinct=True))
        )

        results = []
        for ev in evaluators:
            evaluator_mean = float(ev["avg_score"])
            z = (evaluator_mean - pop_mean) / pop_std if pop_std > 0 else 0.0
            is_outlier = abs(z) > EvaluatorBiasService.Z_THRESHOLD

            entry = {
                "student_id":         str(ev["submission__student__id"]),
                "student_name":       f"{ev['submission__student__student_profile__first_name']} "
                                       f"{ev['submission__student__student_profile__last_name']}",
                "student_code":       ev["submission__student__student_profile__student_code"],
                "avg_score_given":    round(evaluator_mean, 2),
                "submissions_count":  ev["submissions_count"],
                "z_score":            round(z, 3),
                "is_outlier":         is_outlier,
                "direction":          "lenient" if z > 0 else "severe",
            }

            if EvaluatorBiasConfig.get_solo().normalization_enabled and pop_std > 0:
                evaluator_scores = [
                    r["score"] for r in qs.filter(submission__student_id=ev["submission__student__id"])
                    .values("score")
                ]
                evaluator_std = _std(evaluator_scores)
                if evaluator_std > 0:
                    normalized = [
                        pop_mean + (s - evaluator_mean) * (pop_std / evaluator_std)
                        for s in evaluator_scores
                    ]
                    entry["normalized_avg_score"] = round(_mean(normalized), 2)
                else:
                    entry["normalized_avg_score"] = round(pop_mean, 2)

            results.append(entry)

        return sorted(results, key=lambda x: abs(x["z_score"]), reverse=True)


# ── Recommandations ────────────────────────────────────────────────────────────

class RecommendationService:

    SCORE_THRESHOLD = 60.0   # en dessous → recommandation d'amélioration

    @staticmethod
    def generate(teacher_id, semester_id=None, campaign_id=None):
        qs = EvaluationSubmission.objects.filter(
            teacher_id=teacher_id,
            status=EvaluationSubmission.Status.SUBMITTED,
        )
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)
        elif semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)

        global_avg = qs.aggregate(avg=Avg("global_score"))["avg"]
        if global_avg is None:
            return {"teacher_id": str(teacher_id), "global_avg": None, "recommendations": [], "needs_improvement": False}

        global_avg = float(global_avg)

        # Scores par critère
        criteria_avgs = (
            EvaluationResponse.objects.filter(submission__in=qs)
            .values("criteria__id", "criteria__name", "criteria__category")
            .annotate(avg_score=Avg("score"))
            .order_by("avg_score")
        )

        recommendations = []
        for c in criteria_avgs:
            score_pct = (float(c["avg_score"]) / 10) * 100
            if score_pct < RecommendationService.SCORE_THRESHOLD:
                recommendations.append({
                    "criteria_id":   str(c["criteria__id"]),
                    "criteria_name": c["criteria__name"],
                    "category":      c["criteria__category"],
                    "avg_score":     round(float(c["avg_score"]), 2),
                    "score_pct":     round(score_pct, 1),
                    "recommendation": RecommendationService._message(c["criteria__category"]),
                    "trainings":     RecommendationService._trainings_for(c["criteria__category"]),
                })

        return {
            "teacher_id":       str(teacher_id),
            "global_avg":       round(global_avg, 2),
            "recommendations":  recommendations,
            "needs_improvement": global_avg < RecommendationService.SCORE_THRESHOLD,
        }

    @staticmethod
    def _message(category):
        messages = {
            "PEDAGOGY":     "Améliorer les méthodes pédagogiques et la clarté des explications.",
            "CONTENT":      "Enrichir et actualiser le contenu du cours.",
            "BEHAVIOR":     "Travailler sur la relation avec les étudiants.",
            "AVAILABILITY": "Augmenter la disponibilité pour les étudiants (permanences, réponses).",
            "ORGANIZATION": "Améliorer la planification et la ponctualité des cours.",
        }
        return messages.get(category, "Améliorer ce critère.")

    @staticmethod
    def _trainings_for(category, limit=2):
        catalog = TrainingCatalog.objects.filter(category=category, is_active=True)[:limit]
        return [
            {
                "id":       str(t.id),
                "title":    t.title,
                "provider": t.provider,
                "url":      t.url,
            }
            for t in catalog
        ]


# ── Prédiction par régression linéaire ──────────────────────────────────────────

class TeacherPredictionService:
    """
    Prédiction du score futur d'un enseignant par régression linéaire simple
    sur son historique de semestres (pas de LSTM/deep learning, hors
    périmètre v1 du cahier des charges). Nécessite au moins 2 semestres de
    données pour cet enseignant ; sinon renvoie explicitement un statut
    "insufficient_data" plutôt que de fabriquer une prédiction.
    """

    @staticmethod
    def _history(teacher_id):
        """Liste [(semester_id, x, avg_global_score), ...] triée chronologiquement."""
        rows = (
            EvaluationSubmission.objects.filter(
                teacher_id=teacher_id, status=EvaluationSubmission.Status.SUBMITTED,
            )
            .values("campaign__semester_id", "campaign__semester__start_date")
            .annotate(avg_score=Avg("global_score"))
            .order_by("campaign__semester__start_date")
        )
        return [
            (str(r["campaign__semester_id"]), i, float(r["avg_score"]))
            for i, r in enumerate(rows)
        ]

    @staticmethod
    def _category_trends(teacher_id, history):
        """
        Pente de la moyenne de chaque catégorie de critère sur le même axe
        chronologique que l'historique global, triée par magnitude — sert
        d'explication ("quels critères pèsent le plus dans la tendance").
        """
        semester_to_x = {semester_id: x for semester_id, x, _ in history}

        rows = (
            EvaluationResponse.objects.filter(
                submission__teacher_id=teacher_id,
                submission__status=EvaluationSubmission.Status.SUBMITTED,
            )
            .values("submission__campaign__semester_id", "criteria__category")
            .annotate(avg_score=Avg("score"))
        )

        per_category = defaultdict(list)
        for r in rows:
            semester_id = str(r["submission__campaign__semester_id"])
            if semester_id not in semester_to_x:
                continue
            per_category[r["criteria__category"]].append((semester_to_x[semester_id], float(r["avg_score"])))

        trends = []
        for category, points in per_category.items():
            fit = _ols(points)
            if fit:
                trends.append({
                    "category":    category,
                    "slope":       round(fit["slope"], 4),
                    "data_points": len(points),
                })
        return sorted(trends, key=lambda t: abs(t["slope"]), reverse=True)

    @staticmethod
    def train(teacher_id):
        from .models import TeacherScorePrediction

        history = TeacherPredictionService._history(teacher_id)
        points = [(x, y) for _, x, y in history]
        fit = _ols(points)

        if fit is None:
            return TeacherScorePrediction.objects.create(
                teacher_id=teacher_id,
                data_points=len(points),
                details={"status": "insufficient_data"},
            )

        next_x = points[-1][0] + 1
        predicted = max(0.0, min(100.0, fit["slope"] * next_x + fit["intercept"]))
        category_trends = TeacherPredictionService._category_trends(teacher_id, history)

        return TeacherScorePrediction.objects.create(
            teacher_id=teacher_id,
            predicted_score=round(predicted, 2),
            slope=round(fit["slope"], 4),
            r_squared=round(fit["r_squared"], 4),
            data_points=len(points),
            details={"status": "ok", "category_trends": category_trends},
        )

    @staticmethod
    def latest(teacher_id):
        from .models import TeacherScorePrediction
        return TeacherScorePrediction.objects.filter(teacher_id=teacher_id).first()


# ── Réentraînement (point d'accroche générique) ─────────────────────────────────

class ModelTrainingService:
    """
    Point d'entrée unique du réentraînement des modèles IA/biais, déclenché
    automatiquement quand un semestre bascule actif → inactif (voir
    SemesterService.sync_statuses), ou manuellement via les endpoints
    POST existants pour un besoin urgent. Sera complété par les chantiers
    Analytics (reclassification) et IA & Clusters (K-Means, régression)
    sans changer ce point d'appel.
    """

    @staticmethod
    def retrain_for_semesters(semester_ids):
        from .models import ClusteringResult, EvaluatorBiasResult
        from apps.analytics.services import AnalyticsService

        for semester_id in semester_ids:
            results = EvaluatorBiasService.run(semester_id=semester_id)
            EvaluatorBiasResult.objects.create(semester_id=semester_id, results=results)

            # Vérifie que la classification se recalcule sans erreur sur ce
            # semestre — recalculée à la volée à chaque lecture (comme le
            # reste d'Analytics), aucun stockage dédié nécessaire ici.
            AnalyticsService.teacher_classification(semester_id=semester_id)

            clustering = KMeansService.run(k=4, semester_id=semester_id)
            ClusteringResult.objects.create(semester_id=semester_id, k=clustering["k"], clusters=clustering)

            teacher_ids = (
                EvaluationSubmission.objects.filter(
                    status=EvaluationSubmission.Status.SUBMITTED,
                    campaign__semester_id=semester_id,
                )
                .values_list("teacher_id", flat=True)
                .distinct()
            )
            for teacher_id in teacher_ids:
                TeacherPredictionService.train(teacher_id)
