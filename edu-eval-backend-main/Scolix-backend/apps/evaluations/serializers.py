from decimal import Decimal

from rest_framework import serializers

from .models import EvaluationCriteria, CampaignCriteria

from apps.campaigns.models import EvaluationCampaign
from apps.sync.models import CourseSync, TeacherSync
from .models import EvaluationSubmission, EvaluationResponse, TeacherReport, TeacherSelfAssessment


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = [
            "id",
            "name",
            "description",
            "category",
            "is_active",
            "version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class CampaignCriteriaSerializer(serializers.ModelSerializer):
    criteria_name = serializers.CharField(source="criteria.name", read_only=True)
    criteria_category = serializers.CharField(source="criteria.category", read_only=True)
    criteria_description = serializers.CharField(source="criteria.description", read_only=True)

    class Meta:
        model = CampaignCriteria
        fields = [
            "id",
            "campaign",
            "criteria",
            "criteria_name",
            "criteria_category",
            "criteria_description",
            "percentage",
        ]
        read_only_fields = ["id", "campaign"]


class CampaignCriteriaSetSerializer(serializers.Serializer):
    criteria = serializers.UUIDField()
    percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("100")
    )


class EvaluationResponseInputSerializer(serializers.Serializer):
    criteria_id = serializers.UUIDField()
    score = serializers.IntegerField(min_value=0, max_value=10)
    comment = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_criteria_id(self, value):
        try:
            return EvaluationCriteria.objects.get(id=value, is_active=True)
        except EvaluationCriteria.DoesNotExist:
            raise serializers.ValidationError("Critère introuvable ou inactif.")


def _validate_teacher_for_course(course, teacher_id):
    """Le teacher_id soumis doit être le professeur principal du cours ou
    l'un de ses professeurs secondaires — jamais un tiers sans rapport."""
    valid_ids = {str(course.teacher_id)} | {str(tid) for tid in course.secondary_teachers.values_list("id", flat=True)}
    if str(teacher_id) not in valid_ids:
        raise serializers.ValidationError(
            {"teacher_id": "Cet enseignant n'est pas rattaché à ce cours (ni principal, ni secondaire)."}
        )
    try:
        return TeacherSync.objects.get(id=teacher_id)
    except TeacherSync.DoesNotExist:
        raise serializers.ValidationError({"teacher_id": "Enseignant introuvable."})


class EvaluationSubmissionCreateSerializer(serializers.Serializer):
    campaign_id = serializers.UUIDField()
    course_id = serializers.UUIDField()
    # Quel enseignant du cours (principal ou secondaire) est évalué par cette
    # soumission — voir CourseSync.secondary_teachers.
    teacher_id = serializers.UUIDField()
    responses = EvaluationResponseInputSerializer(many=True)
    # Question NPS ("recommanderiez-vous cet enseignant ?"), obligatoire,
    # indépendante des critères pondérés (n'entre pas dans global_score).
    recommendation_score = serializers.IntegerField(min_value=0, max_value=10)

    def validate_campaign_id(self, value):
        try:
            return EvaluationCampaign.objects.get(id=value)
        except EvaluationCampaign.DoesNotExist:
            raise serializers.ValidationError("Campagne introuvable.")

    def validate_course_id(self, value):
        try:
            return CourseSync.objects.get(id=value, is_active=True)
        except CourseSync.DoesNotExist:
            raise serializers.ValidationError("Cours introuvable ou inactif.")

    def validate(self, attrs):
        if not attrs.get("responses"):
            raise serializers.ValidationError({
                "responses": "La liste des réponses ne peut pas être vide."
            })

        criteria_ids = [str(item["criteria_id"].id) for item in attrs["responses"]]

        if len(criteria_ids) != len(set(criteria_ids)):
            raise serializers.ValidationError({
                "responses": "Un critère ne peut pas être évalué plusieurs fois."
            })

        if "course_id" in attrs and "teacher_id" in attrs:
            attrs["teacher_id"] = _validate_teacher_for_course(attrs["course_id"], attrs["teacher_id"])

        return attrs


class EvaluationDraftSerializer(serializers.Serializer):
    campaign_id = serializers.UUIDField()
    course_id = serializers.UUIDField()
    teacher_id = serializers.UUIDField()
    responses = EvaluationResponseInputSerializer(many=True, required=False)
    recommendation_score = serializers.IntegerField(min_value=0, max_value=10, required=False, allow_null=True)

    def validate_campaign_id(self, value):
        try:
            return EvaluationCampaign.objects.get(id=value)
        except EvaluationCampaign.DoesNotExist:
            raise serializers.ValidationError("Campagne introuvable.")

    def validate_course_id(self, value):
        try:
            return CourseSync.objects.get(id=value, is_active=True)
        except CourseSync.DoesNotExist:
            raise serializers.ValidationError("Cours introuvable ou inactif.")

    def validate(self, attrs):
        if "course_id" in attrs and "teacher_id" in attrs:
            attrs["teacher_id"] = _validate_teacher_for_course(attrs["course_id"], attrs["teacher_id"])
        return attrs


class EvaluationResponseSerializer(serializers.ModelSerializer):
    criteria_name = serializers.CharField(source="criteria.name", read_only=True)
    criteria_category = serializers.CharField(source="criteria.category", read_only=True)

    class Meta:
        model = EvaluationResponse
        fields = [
            "id",
            "criteria",
            "criteria_name",
            "criteria_category",
            "score",
            "comment",
            "created_at",
        ]


class EvaluationSubmissionSerializer(serializers.ModelSerializer):
    campaign_title = serializers.CharField(source="campaign.title", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    student_email = serializers.EmailField(source="student.email", read_only=True)
    responses = EvaluationResponseSerializer(many=True, read_only=True)

    class Meta:
        model = EvaluationSubmission
        fields = [
            "id",
            "campaign",
            "campaign_title",
            "course",
            "course_name",
            "course_code",
            "teacher",
            "teacher_name",
            "student",
            "student_email",
            "student_ref_hash",
            "status",
            "global_score",
            "recommendation_score",
            "submitted_at",
            "created_at",
            "updated_at",
            "responses",
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        # Une soumission n'est jamais reliée nominativement à l'étudiant dans la
        # vue d'un enseignant : seul `student_ref_hash` (non réversible) reste
        # visible. ADMIN/DIRECTOR et l'étudiant propriétaire gardent `student`/
        # `student_email` (get_queryset les limite déjà à leurs propres données).
        if request is not None and getattr(request.user, "role", None) == "TEACHER":
            data.pop("student", None)
            data.pop("student_email", None)
        return data


class MyEvaluableCourseSerializer(serializers.Serializer):
    course_id = serializers.UUIDField()
    course_code = serializers.CharField()
    course_name = serializers.CharField()
    teacher_id = serializers.UUIDField()
    teacher_name = serializers.CharField()
    is_secondary_teacher = serializers.BooleanField()
    semester_id = serializers.UUIDField()
    semester_name = serializers.CharField()
    campaign_id = serializers.UUIDField()
    campaign_title = serializers.CharField()
    campaign_end_date = serializers.DateTimeField()
    already_submitted = serializers.BooleanField()
    has_draft = serializers.BooleanField()


class TeacherReportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.student_profile.full_name", read_only=True)
    student_email = serializers.EmailField(source="student.email", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = TeacherReport
        fields = [
            "id",
            "student",
            "student_name",
            "student_email",
            "teacher",
            "teacher_name",
            "department",
            "department_name",
            "title",
            "description",
            "status",
            "admin_response",
            "response_at",
            "created_at",
        ]
        read_only_fields = fields


class TeacherReportAdminSerializer(TeacherReportSerializer):
    """Vue admin/directeur : ajoute la mise en garde envoyée à l'enseignant,
    qui n'est jamais exposée à l'étudiant."""

    class Meta(TeacherReportSerializer.Meta):
        fields = TeacherReportSerializer.Meta.fields + ["teacher_warning", "warned_at"]
        read_only_fields = fields


class TeacherReportMessageSerializer(serializers.Serializer):
    message = serializers.CharField(trim_whitespace=True)


class TeacherReportCreateSerializer(serializers.Serializer):
    teacher_id = serializers.UUIDField()
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()

    def validate_teacher_id(self, value):
        try:
            return TeacherSync.objects.get(id=value, is_active=True)
        except TeacherSync.DoesNotExist:
            raise serializers.ValidationError("Enseignant introuvable ou inactif.")


class TeacherDashboardSerializer(serializers.Serializer):
    teacher_name = serializers.CharField()
    teacher_email = serializers.EmailField()
    total_evaluations = serializers.IntegerField()
    global_average = serializers.DecimalField(max_digits=5, decimal_places=2)

    criteria_averages = serializers.ListField()
    evaluated_courses = serializers.ListField()
    recent_comments = serializers.ListField()
    total_enrolled = serializers.IntegerField()


class TeacherSelfAssessmentSaveSerializer(serializers.Serializer):
    responses = EvaluationResponseInputSerializer(many=True)


class TeacherSelfAssessmentResponseSerializer(serializers.Serializer):
    criteria = serializers.UUIDField(source="criteria.id")
    criteria_name = serializers.CharField(source="criteria.name")
    criteria_category = serializers.CharField(source="criteria.category")
    score = serializers.IntegerField()


class TeacherSelfAssessmentSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source="semester.name", read_only=True)
    responses = TeacherSelfAssessmentResponseSerializer(many=True, read_only=True)

    class Meta:
        model = TeacherSelfAssessment
        fields = ["id", "semester", "semester_name", "submitted_at", "responses"]
        read_only_fields = fields