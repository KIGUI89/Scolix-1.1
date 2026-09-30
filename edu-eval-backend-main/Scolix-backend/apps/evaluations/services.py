from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone

from apps.evaluations.models import (
    EvaluationSubmission,
    EvaluationResponse,
    CampaignCriteria,
    TeacherSelfAssessment,
    TeacherSelfAssessmentResponse,
)
from apps.campaigns.models import EvaluationCampaign
from apps.sync.models import StudentCourseEnrollment, StudentSync


class EvaluationSubmissionService:
    @staticmethod
    @transaction.atomic
    def submit_evaluation(*, student_user, campaign, course, teacher, responses_data, recommendation_score=None):
        if student_user.role != "STUDENT":
            raise ValidationError("Seuls les étudiants peuvent soumettre une évaluation.")

        if not student_user.student_profile:
            raise ValidationError("Compte étudiant invalide.")

        student_profile: StudentSync = student_user.student_profile

        if not student_profile.is_active:
            raise ValidationError("Ce compte étudiant est inactif.")

        if campaign.is_deleted or not campaign.is_open:
            raise ValidationError("La campagne n'est pas ouverte.")

        enrollment_exists = StudentCourseEnrollment.objects.filter(
            student=student_profile,
            course=course,
            semester=campaign.semester,
            is_active=True,
        ).exists()

        if not enrollment_exists:
            raise ValidationError("L'étudiant n'est pas inscrit à ce cours.")

        existing = EvaluationSubmission.objects.filter(
            campaign=campaign,
            course=course,
            teacher=teacher,
            student=student_user,
        ).first()

        if existing and existing.status == EvaluationSubmission.Status.SUBMITTED:
            raise ValidationError("Vous avez déjà soumis cette évaluation.")

        campaign_criteria = CampaignCriteria.objects.filter(campaign=campaign).select_related("criteria")

        if not campaign_criteria:
            raise ValidationError("Cette campagne ne comporte aucun critère à évaluer.")

        required_criteria_ids = {str(cc.criteria_id) for cc in campaign_criteria}
        percentage_by_criteria_id = {str(cc.criteria_id): cc.percentage for cc in campaign_criteria}
        submitted_criteria_ids = {str(item["criteria_id"].id) for item in responses_data}

        if required_criteria_ids != submitted_criteria_ids:
            raise ValidationError("Tous les critères de cette campagne doivent être évalués.")

        total_weight = Decimal("0")
        weighted_score = Decimal("0")

        for item in responses_data:
            criteria_id = str(item["criteria_id"].id)
            score = Decimal(str(item["score"]))
            percentage = percentage_by_criteria_id[criteria_id]

            total_weight += percentage
            weighted_score += (score / Decimal("10")) * percentage

        if total_weight == 0:
            raise ValidationError("Poids total invalide.")

        global_score = (weighted_score / total_weight) * Decimal("100")

        if existing:
            submission = existing
            submission.status = EvaluationSubmission.Status.SUBMITTED
            submission.global_score = round(global_score, 2)
            submission.recommendation_score = recommendation_score
            submission.submitted_at = timezone.now()
            submission.save()
            submission.responses.all().delete()
        else:
            submission = EvaluationSubmission.objects.create(
                campaign=campaign,
                course=course,
                teacher=teacher,
                student=student_user,
                status=EvaluationSubmission.Status.SUBMITTED,
                global_score=round(global_score, 2),
                recommendation_score=recommendation_score,
                submitted_at=timezone.now(),
            )

        responses = [
            EvaluationResponse(
                submission=submission,
                criteria=item["criteria_id"],
                score=item["score"],
                comment=item.get("comment"),
            )
            for item in responses_data
        ]

        EvaluationResponse.objects.bulk_create(responses)

        return submission

    @staticmethod
    @transaction.atomic
    def save_draft(*, student_user, campaign, course, teacher, responses_data, recommendation_score=None):
        if student_user.role != "STUDENT":
            raise ValidationError("Seuls les étudiants peuvent enregistrer un brouillon.")

        if not student_user.student_profile:
            raise ValidationError("Compte étudiant invalide.")

        if campaign.is_deleted or not campaign.is_open:
            raise ValidationError("La campagne n'est pas ouverte.")

        enrollment_exists = StudentCourseEnrollment.objects.filter(
            student=student_user.student_profile,
            course=course,
            semester=campaign.semester,
            is_active=True,
        ).exists()

        if not enrollment_exists:
            raise ValidationError("L'étudiant n'est pas inscrit à ce cours.")

        existing = EvaluationSubmission.objects.filter(
            campaign=campaign,
            course=course,
            teacher=teacher,
            student=student_user,
        ).first()

        if existing and existing.status == EvaluationSubmission.Status.SUBMITTED:
            raise ValidationError("Vous avez déjà soumis cette évaluation.")

        if existing:
            submission = existing
            submission.responses.all().delete()
        else:
            submission = EvaluationSubmission(
                campaign=campaign,
                course=course,
                teacher=teacher,
                student=student_user,
                status=EvaluationSubmission.Status.DRAFT,
            )

        submission.status = EvaluationSubmission.Status.DRAFT
        submission.recommendation_score = recommendation_score
        submission.global_score = 0
        submission.save()

        responses = [
            EvaluationResponse(
                submission=submission,
                criteria=item["criteria_id"],
                score=item["score"],
                comment=item.get("comment"),
            )
            for item in responses_data
        ]

        EvaluationResponse.objects.bulk_create(responses)

        return submission

    @staticmethod
    def get_draft(*, student_user, campaign_id, course_id, teacher_id):
        return (
            EvaluationSubmission.objects.filter(
                campaign_id=campaign_id,
                course_id=course_id,
                teacher_id=teacher_id,
                student=student_user,
                status=EvaluationSubmission.Status.DRAFT,
            )
            .prefetch_related("responses")
            .first()
        )


class TeacherDashboardService:

    @staticmethod
    def _current_semester_scope(teacher):
        # `teacher` (pas `course__teacher`) : ne compte que les soumissions qui
        # évaluent CET enseignant — s'il est secondaire sur un cours, seules
        # les soumissions qui le ciblent lui comptent, pas celles du principal.
        all_submissions = EvaluationSubmission.objects.filter(
            teacher=teacher,
            status=EvaluationSubmission.Status.SUBMITTED,
        )

        # "Ce semestre" == le semestre le plus récent dans lequel cet
        # enseignant a reçu au moins une évaluation soumise. Tout le tableau
        # de bord (KPIs, critères, modules) est calculé sur ce périmètre pour
        # rester cohérent d'un bloc à l'autre.
        latest = all_submissions.order_by("-campaign__semester__start_date").values(
            "campaign__semester_id"
        ).first()
        current_semester_id = latest["campaign__semester_id"] if latest else None
        submissions = all_submissions.filter(campaign__semester_id=current_semester_id)
        return all_submissions, submissions, current_semester_id

    @staticmethod
    def get_course_detail(teacher, course_id):
        """Résultats d'un module évalué (même périmètre semestriel que la liste
        « Modules évalués ») : scores moyens par critère et commentaires
        anonymes. None si ce module n'a reçu aucune évaluation sur ce périmètre."""
        _, submissions, _ = TeacherDashboardService._current_semester_scope(teacher)
        course_submissions = submissions.filter(course_id=course_id)
        first = course_submissions.select_related("course", "campaign__semester").first()
        if not first:
            return None

        responses = EvaluationResponse.objects.filter(submission__in=course_submissions)
        criteria_averages = (
            responses.values("criteria__id", "criteria__name", "criteria__category")
            .annotate(average_score=Avg("score"), total_responses=Count("id"))
            .order_by("criteria__category", "criteria__name")
        )
        comments = (
            responses.exclude(comment__isnull=True).exclude(comment="")
            .values("criteria__name", "score", "comment", "created_at")
            .order_by("-created_at")
        )
        return {
            "course_id": str(first.course.id),
            "course_code": first.course.code,
            "course_name": first.course.name,
            "semester_name": first.campaign.semester.name,
            "total_evaluations": course_submissions.count(),
            "average_score": course_submissions.aggregate(avg=Avg("global_score"))["avg"],
            "criteria_averages": [
                {
                    "criteria_id": str(c["criteria__id"]),
                    "criteria_name": c["criteria__name"],
                    "category": c["criteria__category"],
                    "average_score": round(float(c["average_score"]), 2),
                    "total_responses": c["total_responses"],
                }
                for c in criteria_averages
            ],
            "comments": [
                {
                    "criteria_name": c["criteria__name"],
                    "score": c["score"],
                    "comment": c["comment"],
                    "created_at": c["created_at"],
                }
                for c in comments
            ],
        }

    @staticmethod
    def get_teacher_dashboard(teacher):
        all_submissions, submissions, current_semester_id = TeacherDashboardService._current_semester_scope(teacher)

        total_evaluations = submissions.count()

        global_average = submissions.aggregate(
            avg_score=Avg("global_score")
        )["avg_score"]

        responses = EvaluationResponse.objects.filter(
            submission__in=submissions
        )

        criteria_averages = (
            responses.values(
                "criteria__id",
                "criteria__name",
                "criteria__category",
            )
            .annotate(
                average_score=Avg("score"),
                total_responses=Count("id"),
            )
            .order_by("-average_score")
        )

        recent_comments = responses.exclude(
            comment__isnull=True
        ).exclude(
            comment=""
        ).values(
            "criteria__name",
            "comment",
            "created_at",
            "submission__course__name",
        ).order_by("-created_at")[:10]

        evaluated_courses = list(
            submissions.values(
                "course__id",
                "course__code",
                "course__name",
            )
            .annotate(
                total_evaluations=Count("id"),
                average_score=Avg("global_score"),
            )
            .order_by("-average_score")
        )

        # Réel : nombre d'étudiants inscrits ce semestre par cours (permet un
        # vrai taux de réponse), et évolution du score par cours entre ce
        # semestre et le précédent où il a été évalué.
        course_ids = [c["course__id"] for c in evaluated_courses]
        enrollment_counts = dict(
            StudentCourseEnrollment.objects.filter(
                course_id__in=course_ids, semester_id=current_semester_id, is_active=True,
            )
            .values("course_id")
            .annotate(n=Count("id"))
            .values_list("course_id", "n")
        )
        per_course_semester = (
            all_submissions.filter(course_id__in=course_ids)
            .values("course__id", "campaign__semester__start_date")
            .annotate(avg=Avg("global_score"))
            .order_by("course__id", "campaign__semester__start_date")
        )
        semester_history_by_course: dict = {}
        for row in per_course_semester:
            semester_history_by_course.setdefault(row["course__id"], []).append(row["avg"])

        for c in evaluated_courses:
            history = semester_history_by_course.get(c["course__id"], [])
            c["enrolled_count"] = enrollment_counts.get(c["course__id"], 0)
            c["score_delta"] = round(float(history[-1]) - float(history[-2]), 1) if len(history) >= 2 else None

        return {
            "teacher_name": teacher.full_name,
            "teacher_email": teacher.email,
            "total_evaluations": total_evaluations,
            "global_average": global_average or 0,
            "criteria_averages": list(criteria_averages),
            "evaluated_courses": evaluated_courses,
            "recent_comments": list(recent_comments),
            "total_enrolled": sum(c["enrolled_count"] for c in evaluated_courses),
        }


class TeacherSelfAssessmentService:
    @staticmethod
    def get_current_semester_id(teacher):
        """Même définition de "semestre courant" que le tableau de bord
        enseignant : le plus récent où il a une activité réelle, sinon le
        semestre de la campagne active la plus récente."""
        latest_with_activity = (
            EvaluationSubmission.objects.filter(
                teacher=teacher, status=EvaluationSubmission.Status.SUBMITTED,
            )
            .order_by("-campaign__semester__start_date")
            .values_list("campaign__semester_id", flat=True)
            .first()
        )
        if latest_with_activity:
            return latest_with_activity

        return (
            EvaluationCampaign.objects.filter(status=EvaluationCampaign.Status.ACTIVE, is_deleted=False)
            .order_by("-semester__start_date")
            .values_list("semester_id", flat=True)
            .first()
        )

    @staticmethod
    @transaction.atomic
    def save(*, teacher, responses_data):
        semester_id = TeacherSelfAssessmentService.get_current_semester_id(teacher)
        if not semester_id:
            raise ValidationError("Aucun semestre actif pour l'auto-évaluation.")

        if not responses_data:
            raise ValidationError("La liste des réponses ne peut pas être vide.")

        assessment, _ = TeacherSelfAssessment.objects.update_or_create(
            teacher=teacher,
            semester_id=semester_id,
            defaults={"submitted_at": timezone.now()},
        )
        assessment.responses.all().delete()
        TeacherSelfAssessmentResponse.objects.bulk_create([
            TeacherSelfAssessmentResponse(
                assessment=assessment,
                criteria=item["criteria_id"],
                score=item["score"],
            )
            for item in responses_data
        ])
        return assessment

    @staticmethod
    def get_latest(teacher):
        return (
            TeacherSelfAssessment.objects.filter(teacher=teacher)
            .select_related("semester")
            .prefetch_related("responses__criteria")
            .order_by("-submitted_at")
            .first()
        )