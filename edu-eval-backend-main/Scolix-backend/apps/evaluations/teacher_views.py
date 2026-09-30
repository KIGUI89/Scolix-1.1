from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sync.models import TeacherSync
from apps.sync.serializers import TeacherSyncSerializer
from apps.evaluations.models import EvaluationSubmission, EvaluationResponse
from apps.analytics.services import AnalyticsService


class TeacherListView(APIView):
    """GET /api/teachers/"""
    def get(self, request):
        if request.user.role not in ["ADMIN", "DIRECTOR"]:
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        qs = TeacherSync.objects.select_related("department").filter(is_active=True)
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(matricule__icontains=search))
        return Response({"count": qs.count(), "results": TeacherSyncSerializer(qs.order_by("last_name"), many=True).data})


class TeacherDetailView(APIView):
    """GET /api/teachers/{teacher_id}/"""
    def get(self, request, teacher_id):
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile and str(user.teacher_profile.id) == str(teacher_id))
        if not (user.role in ["ADMIN", "DIRECTOR"] or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = TeacherSync.objects.select_related("department").get(id=teacher_id)
        except TeacherSync.DoesNotExist:
            return Response({"detail": "Introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TeacherSyncSerializer(teacher).data)


class TeacherScoresView(APIView):
    """GET /api/teachers/{teacher_id}/scores/"""
    def get(self, request, teacher_id):
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile and str(user.teacher_profile.id) == str(teacher_id))
        if not (user.role in ["ADMIN", "DIRECTOR"] or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = TeacherSync.objects.get(id=teacher_id)
        except TeacherSync.DoesNotExist:
            return Response({"detail": "Introuvable."}, status=status.HTTP_404_NOT_FOUND)

        qs = EvaluationSubmission.objects.filter(teacher=teacher, status=EvaluationSubmission.Status.SUBMITTED)
        semester_id = request.query_params.get("semester_id")
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)

        global_avg = qs.aggregate(avg=Avg("global_score"))["avg"]
        criteria_scores = (
            EvaluationResponse.objects.filter(submission__in=qs)
            .values("criteria__id", "criteria__name", "criteria__category")
            .annotate(avg_score=Avg("score"), count=Count("id"))
            .order_by("criteria__category")
        )
        semester_history = (
            qs.values("campaign__semester__id", "campaign__semester__name", "campaign__semester__academic_year")
            .annotate(avg_score=Avg("global_score"), count=Count("id"))
            .order_by("campaign__semester__start_date")
        )
        return Response({
            "teacher_id": str(teacher.id), "teacher_name": teacher.full_name,
            "total_evaluations": qs.count(),
            "global_average": round(float(global_avg), 2) if global_avg else None,
            # Mêmes seuils que teacher_ranking/teacher_classification (Analytics) :
            # une seule fonction de classification, pour rester cohérent partout.
            "category": AnalyticsService.classify_teacher(float(global_avg)) if global_avg else None,
            "criteria_scores": [{"criteria_id": str(c["criteria__id"]), "criteria_name": c["criteria__name"],
                                  "category": c["criteria__category"],
                                  "avg_score": round(float(c["avg_score"]), 2), "count": c["count"]} for c in criteria_scores],
            "semester_history": [{"semester_id": str(s["campaign__semester__id"]), "semester_name": s["campaign__semester__name"],
                                   "academic_year": s["campaign__semester__academic_year"],
                                   "avg_score": round(float(s["avg_score"]), 2), "count": s["count"]} for s in semester_history],
        })


class TeacherCommentsView(APIView):
    """GET /api/teachers/{teacher_id}/comments/"""
    def get(self, request, teacher_id):
        user = request.user
        is_own = (user.role == "TEACHER" and user.teacher_profile and str(user.teacher_profile.id) == str(teacher_id))
        if not (user.role in ["ADMIN", "DIRECTOR"] or is_own):
            return Response({"detail": "Permission refusée."}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = TeacherSync.objects.get(id=teacher_id)
        except TeacherSync.DoesNotExist:
            return Response({"detail": "Introuvable."}, status=status.HTTP_404_NOT_FOUND)

        qs = EvaluationSubmission.objects.filter(teacher=teacher, status=EvaluationSubmission.Status.SUBMITTED)
        semester_id = request.query_params.get("semester_id")
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)

        comments = (EvaluationResponse.objects.filter(submission__in=qs)
                    .exclude(comment__isnull=True).exclude(comment="")
                    .select_related("criteria", "submission__campaign__semester"))
        return Response({
            "teacher_id": str(teacher.id), "teacher_name": teacher.full_name,
            "total_comments": comments.count(),
            "comments": [{"comment_id": str(c.id), "criteria_name": c.criteria.name,
                           "category": c.criteria.category, "score": c.score, "comment": c.comment,
                           "semester_name": c.submission.campaign.semester.name,
                           "submitted_at": c.submission.submitted_at} for c in comments.order_by("-submission__submitted_at")],
        })
