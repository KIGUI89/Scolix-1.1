import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TimeStampedSyncModel(models.Model):
    """
    Base commune pour les tables ERP simulées.
    Compatible avec loaddata/fixtures.
    """

    synced_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        abstract = True


class AcademicLevel(models.TextChoices):
    """
    Niveaux LMD — liste fermée partagée par StudentSync.level et CourseSync.level,
    pour que la sélection en cascade filière → niveau → matière côté frontend
    (formulaires Enseignant, Étudiant, Cours) filtre sur des valeurs fiables.
    """
    L1 = "L1", "Licence 1"
    L2 = "L2", "Licence 2"
    L3 = "L3", "Licence 3"
    M1 = "M1", "Master 1"
    M2 = "M2", "Master 2"


class Department(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sync_departments"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class AcademicSemester(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    academic_year = models.CharField(max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    class Meta:
        db_table = "sync_academic_semesters"
        ordering = ["-start_date"]

    def clean(self):
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValidationError("La date de début doit être inférieure à la date de fin.")

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


class Grade(TimeStampedSyncModel):
    """
    Grade / rang académique d'un enseignant (Professeur, Maître Assistant, ...).
    Catalogue géré par l'administration, référencé par TeacherSync.grade.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    rank_order = models.PositiveIntegerField(
        default=0,
        help_text="Position dans la hiérarchie académique (0 = plus haut grade).",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sync_grades"
        ordering = ["rank_order", "name"]

    def __str__(self):
        return self.name


class TeacherSync(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university_id = models.CharField(max_length=80, unique=True)
    matricule = models.CharField(max_length=80, unique=True)

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True, null=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="teachers",
    )

    grade = models.ForeignKey(
        Grade,
        on_delete=models.PROTECT,
        related_name="teachers",
        null=True,
        blank=True,
    )
    specialty = models.CharField(max_length=150, blank=True, null=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sync_teachers"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["university_id"]),
            models.Index(fields=["matricule"]),
            models.Index(fields=["email"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} - {self.matricule}"


class StudentSync(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university_id = models.CharField(max_length=80, unique=True)
    student_code = models.CharField(max_length=80, unique=True)

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True, null=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="students",
    )

    level = models.CharField(max_length=50, choices=AcademicLevel.choices)
    cohort = models.CharField(max_length=80)
    academic_year = models.CharField(max_length=20)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sync_students"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["university_id"]),
            models.Index(fields=["student_code"]),
            models.Index(fields=["email"]),
            models.Index(fields=["level", "cohort"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} - {self.student_code}"


class CourseSync(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    university_id = models.CharField(max_length=80, unique=True)

    code = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True, null=True)

    teacher = models.ForeignKey(
        TeacherSync,
        on_delete=models.PROTECT,
        related_name="courses",
        help_text="Professeur principal du cours.",
    )

    secondary_teachers = models.ManyToManyField(
        TeacherSync,
        related_name="secondary_courses",
        blank=True,
        help_text="Professeurs secondaires co-enseignant ce cours — chacun peut aussi "
                   "être évalué séparément par les étudiants (voir EvaluationSubmission.teacher).",
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="courses",
    )

    grade = models.ForeignKey(
        Grade,
        on_delete=models.SET_NULL,
        related_name="course_assignments",
        blank=True,
        null=True,
        help_text="Rôle/grade du professeur affecté à ce cours (ex. Responsable, Adjoint) — "
                   "propre à ce cours : un même professeur peut avoir un grade différent selon le cours.",
    )

    level = models.CharField(max_length=50, choices=AcademicLevel.choices)
    cohort = models.CharField(max_length=80)
    credit = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sync_courses"
        ordering = ["code"]
        indexes = [
            models.Index(fields=["university_id"]),
            models.Index(fields=["code"]),
            models.Index(fields=["teacher"]),
            models.Index(fields=["semester"]),
            models.Index(fields=["department"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class StudentCourseEnrollment(TimeStampedSyncModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        StudentSync,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    course = models.ForeignKey(
        CourseSync,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    semester = models.ForeignKey(
        AcademicSemester,
        on_delete=models.PROTECT,
        related_name="enrollments",
    )

    is_active = models.BooleanField(default=True)
    enrolled_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "sync_student_course_enrollments"
        unique_together = ("student", "course", "semester")
        ordering = ["-enrolled_at"]
        indexes = [
            models.Index(fields=["student"]),
            models.Index(fields=["course"]),
            models.Index(fields=["semester"]),
        ]

    def clean(self):
        if self.course and self.semester and self.course.semester_id != self.semester_id:
            raise ValidationError("Le semestre de l'inscription doit correspondre au semestre du cours.")

    def __str__(self):
        return f"{self.student.full_name} → {self.course.code}"


class SyncLog(models.Model):
    class SyncType(models.TextChoices):
        FULL = "FULL", "Synchronisation complète"
        PARTIAL = "PARTIAL", "Synchronisation partielle"
        MANUAL = "MANUAL", "Import manuel"

    class SyncStatus(models.TextChoices):
        SUCCESS = "SUCCESS", "Succès"
        PARTIAL = "PARTIAL", "Partiel"
        FAILED = "FAILED", "Échec"
        RUNNING = "RUNNING", "En cours"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    sync_type = models.CharField(
        max_length=20,
        choices=SyncType.choices,
        default=SyncType.MANUAL,
    )
    status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.SUCCESS,
    )

    teachers_count = models.PositiveIntegerField(default=0)
    students_count = models.PositiveIntegerField(default=0)
    courses_count = models.PositiveIntegerField(default=0)
    enrollments_count = models.PositiveIntegerField(default=0)

    # Renseignés pour un import manuel (SyncType.MANUAL), pour que l'historique
    # affiche le fichier importé — vides pour les autres types de synchronisation.
    entity_type = models.CharField(max_length=20, blank=True, null=True)
    source_filename = models.CharField(max_length=255, blank=True, null=True)

    message = models.TextField(blank=True, null=True)
    errors = models.JSONField(blank=True, null=True)

    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "sync_logs"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.sync_type} - {self.status} - {self.started_at}"


class ImportBatch(models.Model):
    """
    État de travail d'un assistant d'import manuel (upload → mapping →
    validation → import). Volontairement séparé de SyncLog : celui-ci ne
    conserve qu'un résumé léger une fois l'import terminé (voir
    apps.sync.import_services.commit_batch), pour que l'historique reste
    rapide à lister sans les lignes brutes du fichier.
    """

    class EntityType(models.TextChoices):
        TEACHER = "TEACHER", "Enseignants"
        STUDENT = "STUDENT", "Étudiants"
        COURSE = "COURSE", "Cours"
        ENROLLMENT = "ENROLLMENT", "Inscriptions"

    class Status(models.TextChoices):
        UPLOADED = "UPLOADED", "Fichier chargé"
        VALIDATED = "VALIDATED", "Validé"
        COMMITTED = "COMMITTED", "Importé"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    original_filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADED)

    headers = models.JSONField(default=list)
    rows = models.JSONField(default=list)
    mapping = models.JSONField(blank=True, null=True)
    validation = models.JSONField(blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_batches",
    )
    created_at = models.DateTimeField(default=timezone.now)
    committed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "sync_import_batches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entity_type} import — {self.original_filename} ({self.status})"