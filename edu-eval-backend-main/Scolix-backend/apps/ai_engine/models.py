"""
AI Engine : les résultats sont stockés en JSON dans ces deux tables légères.
Pas de dépendance numpy/sklearn — algorithmes implémentés en Python pur.
"""
import uuid
from django.db import models
from django.utils import timezone

from apps.evaluations.models import EvaluationCriteria
from apps.sync.models import TeacherSync


class ClusteringResult(models.Model):
    """Résultat d'un clustering K-Means sur les scores enseignants."""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester_id = models.UUIDField(null=True, blank=True)
    k          = models.PositiveSmallIntegerField(default=3)
    clusters   = models.JSONField()        # liste de clusters avec teachers + centroid
    computed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_clustering_results"
        ordering = ["-computed_at"]

    def __str__(self):
        return f"Clustering k={self.k} — {self.computed_at:%Y-%m-%d}"


class BiasDetectionResult(models.Model):
    """Résultat de détection de biais (z-score) par critère — axe enseignant."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester_id = models.UUIDField(null=True, blank=True)
    results     = models.JSONField()   # liste {teacher_id, criteria_id, z_score, is_outlier}
    computed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_bias_detection_results"
        ordering = ["-computed_at"]


class EvaluatorBiasResult(models.Model):
    """Résultat de détection de biais (z-score) — axe étudiant évaluateur."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester_id = models.UUIDField(null=True, blank=True)
    results     = models.JSONField()   # liste {student_id, avg_score_given, z_score, is_outlier, direction}
    computed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_evaluator_bias_results"
        ordering = ["-computed_at"]

    def __str__(self):
        return f"Biais évaluateurs — {self.computed_at:%Y-%m-%d}"


class EvaluatorBiasConfig(models.Model):
    """
    Configuration singleton : active/désactive la normalisation des scores
    par évaluateur affichée sur la page Biais (correction indicative,
    n'altère jamais les données stockées).
    """
    normalization_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_evaluator_bias_config"

    def save(self, *args, **kwargs):
        self.pk = 1
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Normalisation évaluateur : {'activée' if self.normalization_enabled else 'désactivée'}"


class TrainingCatalog(models.Model):
    """
    Catalogue minimal de formations continues (interne/externe), auquel les
    recommandations IA se rattachent selon le critère faible identifié.
    """
    class Provider(models.TextChoices):
        INTERNAL = "INTERNAL", "Interne"
        EXTERNAL = "EXTERNAL", "Externe"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=EvaluationCriteria.Category.choices)
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.INTERNAL)
    url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_training_catalog"
        ordering = ["category", "title"]

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


class TeacherScorePrediction(models.Model):
    """
    Prédiction du score futur d'un enseignant par régression linéaire simple
    sur son historique de semestres. Une ligne par (ré)entraînement ; la plus
    récente pour un enseignant donné fait foi (séparation entraînement/lecture).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(TeacherSync, on_delete=models.CASCADE, related_name="score_predictions")
    predicted_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    slope = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    r_squared = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    data_points = models.PositiveSmallIntegerField(default=0)
    # {"status": "ok"|"insufficient_data", "category_trends": [{category, slope}, ...]}
    details = models.JSONField(default=dict)
    computed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "ai_teacher_score_predictions"
        ordering = ["-computed_at"]
        indexes = [
            models.Index(fields=["teacher", "-computed_at"]),
        ]

    def __str__(self):
        return f"Prédiction {self.teacher_id} — {self.computed_at:%Y-%m-%d}"
