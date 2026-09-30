from django.db import models

# Create your models here.
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from django.conf import settings
from apps.campaigns.models import EvaluationCampaign
from apps.sync.models import AcademicSemester, CourseSync, Department, TeacherSync


class EvaluationCriteria(models.Model):
    class Category(models.TextChoices):
        PEDAGOGY = "PEDAGOGY", "Pédagogie"
        CONTENT = "CONTENT", "Contenu du cours"
        BEHAVIOR = "BEHAVIOR", "Comportement"
        AVAILABILITY = "AVAILABILITY", "Disponibilité"
        ORGANIZATION = "ORGANIZATION", "Organisation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=30, choices=Category.choices)

    is_active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_criteria"
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CampaignCriteria(models.Model):
    """
    Association d'un critère à une campagne, avec le pourcentage qui lui est
    propre pour CETTE campagne (un même critère peut avoir un pourcentage
    différent d'une campagne à l'autre).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    campaign = models.ForeignKey(
        EvaluationCampaign,
        on_delete=models.CASCADE,
        related_name="campaign_criteria",
    )

    criteria = models.ForeignKey(
        EvaluationCriteria,
        on_delete=models.PROTECT,
        related_name="campaign_links",
    )

    percentage = models.DecimalField(max_digits=5, decimal_places=2)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_campaign_criteria"
        unique_together = ("campaign", "criteria")
        ordering = ["criteria__category", "criteria__name"]

    def clean(self):
        if self.percentage <= 0 or self.percentage > 100:
            raise ValidationError("Le pourcentage doit être compris entre 0 et 100.")

        if self.criteria_id and not self.criteria.is_active:
            raise ValidationError("Seuls les critères actifs peuvent être sélectionnés pour une campagne.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.campaign.title} — {self.criteria.name} ({self.percentage}%)"


class EvaluationSubmission(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        SUBMITTED = "SUBMITTED", "Soumise"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    campaign = models.ForeignKey(
        EvaluationCampaign,
        on_delete=models.PROTECT,
        related_name="submissions",
    )

    course = models.ForeignKey(
        CourseSync,
        on_delete=models.PROTECT,
        related_name="evaluation_submissions",
    )

    # Quel enseignant (le principal ou l'un des secondaires de `course`) cette
    # soumission évalue — un cours pouvant avoir plusieurs enseignants, la note
    # va à un seul d'entre eux, jamais partagée. Voir CourseSync.secondary_teachers.
    teacher = models.ForeignKey(
        TeacherSync,
        on_delete=models.PROTECT,
        related_name="evaluation_submissions",
    )

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="evaluation_submissions",
    )

    # Identifiant pseudonymisé de l'étudiant (HMAC-SHA256, non réversible sans
    # SECRET_KEY). Exposé à la place de `student`/`student_email` pour le rôle
    # ENSEIGNANT, afin que la soumission ne puisse pas être reliée nominativement
    # à un étudiant réel dans cette vue. L'ADMIN garde l'accès à `student`.
    student_ref_hash = models.CharField(max_length=64, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )

    global_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Question NPS ("recommanderiez-vous cet enseignant ?", 0 à 10) — distincte
    # des critères pondérés, n'entre pas dans le calcul de global_score.
    # Nullable en base pour ne pas invalider les soumissions déjà existantes ;
    # rendue obligatoire au niveau du serializer pour toute nouvelle soumission.
    recommendation_score = models.PositiveSmallIntegerField(null=True, blank=True)

    submitted_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_submissions"
        unique_together = ("campaign", "course", "student", "teacher")
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["campaign"]),
            models.Index(fields=["course"]),
            models.Index(fields=["teacher"]),
            models.Index(fields=["student"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        if self.student and self.student.role != "STUDENT":
            raise ValidationError("Seul un étudiant peut soumettre une évaluation.")

        if self.student and self.student.student_profile and not self.student.student_profile.is_active:
            raise ValidationError("Ce compte étudiant est inactif.")

        if self.campaign and not self.campaign.is_open:
            raise ValidationError("La campagne n’est pas ouverte aux évaluations.")

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        if self.student_id and not self.student_ref_hash:
            self.student_ref_hash = self.compute_student_ref_hash(self.student_id)
        self.full_clean()
        super().save(*args, **kwargs)

    @staticmethod
    def compute_student_ref_hash(student_id) -> str:
        import hashlib
        import hmac

        return hmac.new(
            settings.SECRET_KEY.encode(),
            str(student_id).encode(),
            hashlib.sha256,
        ).hexdigest()

    def __str__(self):
        return f"{self.student.email} - {self.course.code} - {self.campaign.title}"


class EvaluationResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    submission = models.ForeignKey(
        EvaluationSubmission,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    criteria = models.ForeignKey(
        EvaluationCriteria,
        on_delete=models.PROTECT,
        related_name="responses",
    )

    score = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_responses"
        unique_together = ("submission", "criteria")
        ordering = ["criteria__category", "criteria__name"]
        indexes = [
            models.Index(fields=["submission"]),
            models.Index(fields=["criteria"]),
        ]

    def clean(self):
        if self.score < 0 or self.score > 10:
            raise ValidationError("Le score doit être compris entre 0 et 10.")

    def __str__(self):
        return f"{self.criteria.name} = {self.score}/10"


class TeacherReport(models.Model):
    """
    Signalement libre d'un étudiant sur un professeur, indépendant du
    formulaire d'évaluation noté par critère. Non anonyme (à la différence
    des évaluations) : l'identité de l'étudiant reste visible par l'admin
    pour permettre un suivi.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teacher_reports",
    )
    teacher = models.ForeignKey(
        TeacherSync,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    # Dérivé automatiquement de teacher.department à la création — pas saisi
    # par l'étudiant, uniquement pour permettre un filtrage admin ultérieur.
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="teacher_reports",
    )

    class Status(models.TextChoices):
        NEW = "NEW", "Nouveau"
        READ = "READ", "Lu"
        TREATED = "TREATED", "Traité"

    title = models.CharField(max_length=200)
    description = models.TextField()

    # Suivi administratif : lu à la première consultation par l'admin,
    # traité dès qu'une réponse est envoyée à l'étudiant.
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)

    # Réponse de l'administration, visible par l'étudiant.
    admin_response = models.TextField(blank=True, null=True)
    response_at = models.DateTimeField(blank=True, null=True)

    # Mise en garde adressée à l'enseignant — jamais visible par l'étudiant,
    # et l'enseignant ne reçoit pas l'identité de l'étudiant.
    teacher_warning = models.TextField(blank=True, null=True)
    warned_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_teacher_reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student"]),
            models.Index(fields=["teacher"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Rapport de {self.student_id} sur {self.teacher_id} — {self.title}"


class TeacherSelfAssessment(models.Model):
    """Auto-évaluation d'un enseignant sur les mêmes critères que le
    formulaire étudiant, une par (enseignant, semestre)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    teacher = models.ForeignKey(
        TeacherSync,
        on_delete=models.CASCADE,
        related_name="self_assessments",
    )
    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.CASCADE,
        related_name="teacher_self_assessments",
    )

    submitted_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "evaluations_teacher_self_assessments"
        unique_together = ("teacher", "semester")
        ordering = ["-submitted_at"]

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Auto-évaluation {self.teacher.full_name} — {self.semester.name}"


class TeacherSelfAssessmentResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    assessment = models.ForeignKey(
        TeacherSelfAssessment,
        on_delete=models.CASCADE,
        related_name="responses",
    )
    criteria = models.ForeignKey(
        EvaluationCriteria,
        on_delete=models.PROTECT,
        related_name="teacher_self_assessment_responses",
    )
    score = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "evaluations_teacher_self_assessment_responses"
        unique_together = ("assessment", "criteria")

    def clean(self):
        if self.score < 0 or self.score > 10:
            raise ValidationError("Le score doit être compris entre 0 et 10.")

    def __str__(self):
        return f"{self.criteria.name} = {self.score}/10"