from collections import defaultdict

from django.db.models import Avg, Count, Q, F
from django.utils import timezone

from apps.campaigns.models import EvaluationCampaign
from apps.evaluations.models import EvaluationSubmission, EvaluationResponse
from apps.sync.models import TeacherSync, Department, AcademicSemester, StudentCourseEnrollment
from apps.attendance.models import AttendanceRecord
from .models import ClassificationConfig


class AnalyticsService:

    SATISFACTION_THRESHOLD = 7.0          # note moyenne (/10) à partir de laquelle une soumission est "satisfaite"
    SIGNIFICANT_DEVIATION_PCT = 15.0      # écart relatif (%) déclenchant une alerte de score

    @staticmethod
    def global_kpis(semester_id=None, department_id=None):
        """KPIs globaux : nb évaluations, score moyen, taux participation, nb enseignants évalués."""
        qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(course__department_id=department_id)

        total_submissions    = qs.count()
        avg_score            = qs.aggregate(avg=Avg("global_score"))["avg"]
        teachers_evaluated   = qs.values("teacher").distinct().count()
        total_teachers       = TeacherSync.objects.filter(is_active=True).count()
        participation_rate   = round((teachers_evaluated / total_teachers) * 100, 1) if total_teachers else 0

        completion = AnalyticsService.student_completion(semester_id)
        students_completed = sum(1 for c in completion if c["completed"])
        students_pending   = sum(1 for c in completion if not c["completed"])

        nps = AnalyticsService.nps(semester_id=semester_id, department_id=department_id)
        satisfaction = AnalyticsService.satisfaction_rate(semester_id=semester_id, department_id=department_id)

        return {
            "total_submissions":   total_submissions,
            "avg_global_score":    round(float(avg_score), 2) if avg_score else None,
            "teachers_evaluated":  teachers_evaluated,
            "total_teachers":      total_teachers,
            "participation_rate":  participation_rate,
            "students_completed":  students_completed,
            "students_pending":    students_pending,
            "nps":                 nps["nps"],
            "satisfaction_rate":   satisfaction["satisfaction_rate"],
        }

    @staticmethod
    def nps(semester_id=None, department_id=None, teacher_id=None):
        """
        Net Promoter Score standard : Promoteurs (9-10) - Détracteurs (0-6),
        en % du total des soumissions ayant répondu à la question de
        recommandation. Ne concerne que les soumissions postérieures à
        l'ajout de cette question (recommendation_score peut être NULL sur
        les soumissions plus anciennes, exclues du calcul).
        """
        qs = EvaluationSubmission.objects.filter(
            status=EvaluationSubmission.Status.SUBMITTED,
            recommendation_score__isnull=False,
        )
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(course__department_id=department_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        total = qs.count()
        if not total:
            return {"nps": None, "promoters": 0, "passives": 0, "detractors": 0, "total_responses": 0}

        promoters  = qs.filter(recommendation_score__gte=9).count()
        passives   = qs.filter(recommendation_score__gte=7, recommendation_score__lte=8).count()
        detractors = qs.filter(recommendation_score__lte=6).count()

        return {
            "nps":              round(((promoters - detractors) / total) * 100, 1),
            "promoters":        promoters,
            "passives":         passives,
            "detractors":       detractors,
            "total_responses":  total,
        }

    @staticmethod
    def satisfaction_rate(semester_id=None, department_id=None, teacher_id=None):
        """
        % de soumissions dont la moyenne des scores de critères est >= 7/10 —
        indicateur distinct du score global (pondéré par critère), calculé
        par soumission individuelle.
        """
        qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(course__department_id=department_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        submission_avgs = (
            EvaluationResponse.objects.filter(submission__in=qs)
            .values("submission_id")
            .annotate(avg_score=Avg("score"))
        )
        total = len(submission_avgs)
        if not total:
            return {"satisfaction_rate": None, "satisfied_count": 0, "total_submissions": 0}

        satisfied = sum(1 for s in submission_avgs if s["avg_score"] >= AnalyticsService.SATISFACTION_THRESHOLD)

        return {
            "satisfaction_rate":  round((satisfied / total) * 100, 1),
            "satisfied_count":    satisfied,
            "total_submissions":  total,
        }

    @staticmethod
    def classify_teacher(avg_score):
        """Classe un score moyen (0-100) selon les seuils configurés par l'administration."""
        if avg_score is None:
            return None
        cfg = ClassificationConfig.get_solo()
        if avg_score > float(cfg.exceptional_threshold):
            return "EXCEPTIONAL"
        if avg_score >= float(cfg.progression_threshold):
            return "PROGRESSING"
        return "NEEDS_SUPPORT"

    @staticmethod
    def teacher_classification(semester_id=None, department_id=None):
        """Classification à 3 niveaux de chaque enseignant évalué du périmètre."""
        qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(course__department_id=department_id)

        data = (
            qs.values(
                "teacher__id",
                "teacher__first_name",
                "teacher__last_name",
                "teacher__department__name",
            )
            .annotate(avg_score=Avg("global_score"))
            .order_by("-avg_score")
        )

        return [
            {
                "teacher_id":      str(d["teacher__id"]),
                "teacher_name":    f"{d['teacher__first_name']} {d['teacher__last_name']}",
                "department_name": d["teacher__department__name"],
                "avg_score":       round(float(d["avg_score"]), 2),
                "category":        AnalyticsService.classify_teacher(float(d["avg_score"])),
            }
            for d in data
        ]

    @staticmethod
    def score_alerts(semester_id=None):
        """
        Alerte pour chaque enseignant dont le score moyen du semestre courant
        s'écarte significativement (> SIGNIFICANT_DEVIATION_PCT %) de sa
        propre moyenne historique (autres semestres). Nécessite au moins un
        semestre antérieur avec des données pour cet enseignant ; sinon
        l'enseignant est absent du résultat (pas d'historique = pas d'alerte
        fabriquée).
        """
        current_semester_id = semester_id or (
            AcademicSemester.objects.filter(is_active=True).values_list("id", flat=True).first()
        )
        if not current_semester_id:
            return []

        by_semester = (
            EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
            .values("teacher__id", "teacher__first_name", "teacher__last_name",
                     "campaign__semester_id")
            .annotate(avg_score=Avg("global_score"))
        )

        per_teacher = defaultdict(dict)
        names = {}
        for row in by_semester:
            tid = row["teacher__id"]
            names[tid] = f"{row['teacher__first_name']} {row['teacher__last_name']}"
            per_teacher[tid][row["campaign__semester_id"]] = float(row["avg_score"])

        alerts = []
        for tid, by_sem in per_teacher.items():
            if str(current_semester_id) not in {str(k) for k in by_sem.keys()}:
                continue
            current_avg = next(v for k, v in by_sem.items() if str(k) == str(current_semester_id))
            historical = [v for k, v in by_sem.items() if str(k) != str(current_semester_id)]
            if not historical:
                continue

            historical_avg = sum(historical) / len(historical)
            if historical_avg == 0:
                continue
            deviation_pct = ((current_avg - historical_avg) / historical_avg) * 100

            if abs(deviation_pct) > AnalyticsService.SIGNIFICANT_DEVIATION_PCT:
                alerts.append({
                    "teacher_id":      str(tid),
                    "teacher_name":    names[tid],
                    "current_avg":     round(current_avg, 2),
                    "historical_avg":  round(historical_avg, 2),
                    "deviation_pct":   round(deviation_pct, 1),
                    "direction":       "up" if deviation_pct > 0 else "down",
                })

        return sorted(alerts, key=lambda a: abs(a["deviation_pct"]), reverse=True)

    @staticmethod
    def student_completion(semester_id=None, campaign_id=None):
        """
        Statut de complétion par étudiant : pour chaque étudiant actif concerné par
        au moins une campagne du périmètre, le nombre de créneaux (cours × campagne
        de son semestre) évalués sur le total attendu.

        `campaign_id` restreint le périmètre à une campagne précise (utilisé pour
        les relances, où la complétion doit être évaluée campagne par campagne),
        prioritaire sur `semester_id` s'ils sont fournis tous les deux.
        """
        campaigns = EvaluationCampaign.objects.filter(is_deleted=False)
        if campaign_id:
            campaigns = campaigns.filter(id=campaign_id)
        else:
            campaigns = campaigns.filter(
                status__in=[EvaluationCampaign.Status.ACTIVE, EvaluationCampaign.Status.CLOSED],
            )
            if semester_id:
                campaigns = campaigns.filter(semester_id=semester_id)

        campaigns_by_semester = defaultdict(list)
        for semester_id_, campaign_id in campaigns.values_list("semester_id", "id"):
            campaigns_by_semester[semester_id_].append(campaign_id)

        if not campaigns_by_semester:
            return []

        enrollments = StudentCourseEnrollment.objects.filter(
            is_active=True,
            student__is_active=True,
            student__user_account__isnull=False,
            semester_id__in=campaigns_by_semester.keys(),
        ).select_related("student", "student__department", "student__user_account")

        campaign_ids = [cid for ids in campaigns_by_semester.values() for cid in ids]
        submitted = set(
            EvaluationSubmission.objects.filter(
                status=EvaluationSubmission.Status.SUBMITTED,
                campaign_id__in=campaign_ids,
            ).values_list("student_id", "course_id", "campaign_id")
        )

        per_student = {}
        for e in enrollments:
            for campaign_id in campaigns_by_semester[e.semester_id]:
                entry = per_student.setdefault(e.student_id, {"student": e.student, "total": 0, "done": 0})
                entry["total"] += 1
                if (e.student.user_account.id, e.course_id, campaign_id) in submitted:
                    entry["done"] += 1

        results = []
        for entry in per_student.values():
            s = entry["student"]
            results.append({
                "student_id":        str(s.id),
                "student_name":      s.full_name,
                "student_code":      s.student_code,
                "department_name":   s.department.name if s.department_id else None,
                "total_courses":     entry["total"],
                "submitted_courses": entry["done"],
                "completed":         entry["total"] > 0 and entry["done"] >= entry["total"],
            })
        return results

    @staticmethod
    def teacher_ranking(semester_id=None, top_n=10, department_id=None):
        """Classement des enseignants par score moyen décroissant."""
        qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(course__department_id=department_id)

        ranking = (
            qs.values(
                "teacher__id",
                "teacher__first_name",
                "teacher__last_name",
                "teacher__department__name",
            )
            .annotate(avg_score=Avg("global_score"), eval_count=Count("id"))
            .order_by("-avg_score")[:top_n]
        )

        return [
            {
                "rank":            i + 1,
                "teacher_id":      str(r["teacher__id"]),
                "teacher_name":    f"{r['teacher__first_name']} {r['teacher__last_name']}",
                "department":      r["teacher__department__name"],
                "avg_score":       round(float(r["avg_score"]), 2),
                "eval_count":      r["eval_count"],
                # Même seuils que teacher_classification/classify_teacher : évite une
                # duplication du calcul (et du risque de divergence) côté frontend.
                "category":        AnalyticsService.classify_teacher(float(r["avg_score"])),
            }
            for i, r in enumerate(ranking)
        ]

    @staticmethod
    def department_heatmap(semester_id=None):
        """Score moyen par département."""
        qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            qs = qs.filter(campaign__semester_id=semester_id)

        data = (
            qs.values("course__department__id", "course__department__name", "course__department__code")
            .annotate(avg_score=Avg("global_score"), eval_count=Count("id"))
            .order_by("-avg_score")
        )
        return [
            {
                "department_id":   str(d["course__department__id"]),
                "department_name": d["course__department__name"],
                "department_code": d["course__department__code"],
                "avg_score":       round(float(d["avg_score"]), 2),
                "eval_count":      d["eval_count"],
            }
            for d in data
        ]

    @staticmethod
    def score_trends():
        """Évolution du score moyen par semestre (historique complet)."""
        data = (
            EvaluationSubmission.objects
            .filter(status=EvaluationSubmission.Status.SUBMITTED)
            .values(
                "campaign__semester__id",
                "campaign__semester__name",
                "campaign__semester__academic_year",
                "campaign__semester__start_date",
            )
            .annotate(avg_score=Avg("global_score"), eval_count=Count("id"))
            .order_by("campaign__semester__start_date")
        )
        return [
            {
                "semester_id":    str(d["campaign__semester__id"]),
                "semester_name":  d["campaign__semester__name"],
                "academic_year":  d["campaign__semester__academic_year"],
                "avg_score":      round(float(d["avg_score"]), 2),
                "eval_count":     d["eval_count"],
            }
            for d in data
        ]

    @staticmethod
    def criteria_breakdown(semester_id=None, department_id=None):
        """Score moyen par critère d'évaluation."""
        qs = EvaluationResponse.objects.filter(
            submission__status=EvaluationSubmission.Status.SUBMITTED
        )
        if semester_id:
            qs = qs.filter(submission__campaign__semester_id=semester_id)
        if department_id:
            qs = qs.filter(submission__course__department_id=department_id)

        data = (
            qs.values("criteria__id", "criteria__name", "criteria__category")
            .annotate(avg_score=Avg("score"), response_count=Count("id"))
            .order_by("criteria__category", "criteria__name")
        )
        return [
            {
                "criteria_id":       str(d["criteria__id"]),
                "criteria_name":     d["criteria__name"],
                "criteria_category": d["criteria__category"],
                "avg_score":         round(float(d["avg_score"]), 2),
                "response_count":    d["response_count"],
            }
            for d in data
        ]

    @staticmethod
    def attendance_summary(semester_id=None):
        """Résumé de ponctualité globale (tous enseignants)."""
        qs = AttendanceRecord.objects.all()
        if semester_id:
            # Filtrage par semestre via les cours
            qs = qs.filter(course__semester_id=semester_id)

        total   = qs.count()
        on_time = qs.filter(status=AttendanceRecord.Status.ON_TIME).count()
        late    = qs.filter(status=AttendanceRecord.Status.LATE).count()
        absent  = qs.filter(status=AttendanceRecord.Status.ABSENT).count()

        return {
            "total":             total,
            "on_time":           on_time,
            "late":              late,
            "absent":            absent,
            "punctuality_rate":  round((on_time / total) * 100, 1) if total else 0,
        }

    MIN_CORRELATION_SAMPLE = 3

    @staticmethod
    def punctuality_satisfaction_correlation(semester_id=None):
        """
        Coefficient de corrélation de Pearson entre le taux de ponctualité
        (part des séances à l'heure) et le score de satisfaction moyen
        (score global des évaluations), calculé par enseignant sur
        l'ensemble des enseignants disposant à la fois de relevés de
        présence et d'évaluations soumises. Pas de valeur fabriquée :
        si moins de MIN_CORRELATION_SAMPLE enseignants ont les deux types
        de données, aucun coefficient n'est renvoyé.
        """
        attendance_qs = AttendanceRecord.objects.all()
        submissions_qs = EvaluationSubmission.objects.filter(status=EvaluationSubmission.Status.SUBMITTED)
        if semester_id:
            attendance_qs = attendance_qs.filter(course__semester_id=semester_id)
            submissions_qs = submissions_qs.filter(campaign__semester_id=semester_id)

        attendance_by_teacher = defaultdict(lambda: {"total": 0, "on_time": 0})
        for rec in attendance_qs.values("teacher_id", "status"):
            entry = attendance_by_teacher[rec["teacher_id"]]
            entry["total"] += 1
            if rec["status"] == AttendanceRecord.Status.ON_TIME:
                entry["on_time"] += 1

        satisfaction_by_teacher = (
            submissions_qs.values("teacher_id").annotate(avg_score=Avg("global_score"))
        )
        satisfaction_map = {
            row["teacher_id"]: float(row["avg_score"])
            for row in satisfaction_by_teacher
            if row["avg_score"] is not None
        }

        pairs = [
            (att["on_time"] / att["total"] * 100, satisfaction_map[teacher_id])
            for teacher_id, att in attendance_by_teacher.items()
            if att["total"] > 0 and teacher_id in satisfaction_map
        ]

        n = len(pairs)
        if n < AnalyticsService.MIN_CORRELATION_SAMPLE:
            return {
                "coefficient":  None,
                "sample_size":  n,
                "label":        "Données insuffisantes",
                "description":  (
                    f"Au moins {AnalyticsService.MIN_CORRELATION_SAMPLE} enseignants ayant à la fois des "
                    "relevés de ponctualité et des évaluations soumises sont nécessaires "
                    f"pour calculer une corrélation (actuellement {n})."
                ),
            }

        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        covariance = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
        variance_x = sum((x - mean_x) ** 2 for x in xs)
        variance_y = sum((y - mean_y) ** 2 for y in ys)
        denominator = (variance_x * variance_y) ** 0.5
        r = covariance / denominator if denominator else 0.0

        abs_r = abs(r)
        if abs_r < 0.2:
            label = "corrélation négligeable"
        elif abs_r < 0.4:
            label = "corrélation faible"
        elif abs_r < 0.6:
            label = "corrélation modérée"
        elif abs_r < 0.8:
            label = "corrélation forte"
        else:
            label = "corrélation très forte"

        return {
            "coefficient":  round(r, 2),
            "sample_size":  n,
            "label":        label,
            "description":  f"Coefficient de Pearson calculé sur {n} enseignants (ponctualité vs score global d'évaluation).",
        }
