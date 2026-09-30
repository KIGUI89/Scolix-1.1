import random

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.campaigns.models import EvaluationCampaign
from apps.evaluations.models import CampaignCriteria, EvaluationSubmission
from apps.evaluations.services import EvaluationSubmissionService
from apps.sync.models import StudentCourseEnrollment

# Trois profils de sévérité pour simuler des évaluateurs réalistes : la
# majorité note "normalement", une minorité est systématiquement sévère ou
# indulgente — condition nécessaire pour que le z-score par évaluateur ait
# un signal détectable (cf. rapport d'exploration : 4 soumissions réelles
# en base, largement insuffisant pour un calcul statistique significatif).
#
# Note d'implémentation : EvaluationSubmission.clean() interdit toute
# soumission rattachée à une campagne qui n'est pas actuellement "ouverte"
# (statut ACTIVE + dans sa fenêtre de dates) — y compris à la création
# directe (le save() du modèle appelle full_clean()). Il n'est donc pas
# possible de fabriquer de fausses soumissions "historiques" sur une
# campagne clôturée ou sur un semestre déjà entièrement passé : ce jeu de
# données de test est nécessairement seedé sur les campagnes actuellement
# actives, via le vrai service de soumission (EvaluationSubmissionService),
# ce qui garantit au passage que les données créées sont fonctionnellement
# valides de bout en bout.
PERSONAS = [
    ("normal", 0.70, (5, 8)),
    ("severe", 0.15, (0, 3)),
    ("lenient", 0.15, (9, 10)),
]


def pick_persona(rng):
    r = rng.random()
    acc = 0.0
    for name, weight, score_range in PERSONAS:
        acc += weight
        if r <= acc:
            return name, score_range
    return PERSONAS[0][0], PERSONAS[0][2]


class Command(BaseCommand):
    help = (
        "Enrichit la base d'un jeu de données de test réaliste (soumissions "
        "d'évaluation avec évaluateurs sévères/indulgents/normaux), condition "
        "préalable à la détection de biais par évaluateur. Idempotent."
    )

    def add_arguments(self, parser):
        parser.add_argument("--students", type=int, default=40, help="Nombre d'étudiants évaluateurs à seeder.")
        parser.add_argument("--seed", type=int, default=42, help="Graine aléatoire (reproductibilité).")

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        n_students = options["students"]

        call_command("seed_evaluation_criteria")

        campaigns = list(EvaluationCampaign.objects.filter(
            status=EvaluationCampaign.Status.ACTIVE, is_deleted=False,
        ))
        if not campaigns:
            self.stdout.write(self.style.WARNING(
                "Aucune campagne active trouvée : activez au moins une campagne avant de lancer ce seed."
            ))
            return

        with transaction.atomic():
            personas = self._assign_personas(rng, n_students, campaigns)
            created = 0
            for campaign in campaigns:
                created += self._seed_campaign(personas, campaign, rng)

        counts = {}
        for _, (persona, _) in personas.items():
            counts[persona] = counts.get(persona, 0) + 1
        self.stdout.write(self.style.SUCCESS(
            f"{created} soumission(s) de test créée(s) sur {len(campaigns)} campagne(s) active(s) — "
            f"profils : {counts.get('severe', 0)} sévère(s), {counts.get('lenient', 0)} indulgent(s), "
            f"{counts.get('normal', 0)} normaux."
        ))

    def _assign_personas(self, rng, n_students, campaigns):
        semester_ids = {c.semester_id for c in campaigns}
        student_ids = list(
            StudentCourseEnrollment.objects.filter(
                is_active=True, student__is_active=True, student__user_account__isnull=False,
                semester_id__in=semester_ids,
            ).values_list("student__user_account__id", flat=True).distinct()
        )
        rng.shuffle(student_ids)
        chosen = student_ids[:n_students]
        return {sid: pick_persona(rng) for sid in chosen}

    def _seed_campaign(self, personas, campaign, rng):
        criteria_objs = [
            cc.criteria for cc in CampaignCriteria.objects.filter(campaign=campaign).select_related("criteria")
        ]
        if not criteria_objs:
            return 0

        enrollments = StudentCourseEnrollment.objects.filter(
            semester=campaign.semester, is_active=True, student__is_active=True,
            student__user_account__isnull=False,
        ).select_related("student__user_account", "course")

        count = 0
        for e in enrollments:
            student_user_id = e.student.user_account.id
            if student_user_id not in personas:
                continue
            if EvaluationSubmission.objects.filter(
                campaign=campaign, course=e.course, student_id=student_user_id,
            ).exists():
                continue

            _, score_range = personas[student_user_id]
            responses_data = [
                {"criteria_id": criteria, "score": rng.randint(*score_range), "comment": ""}
                for criteria in criteria_objs
            ]
            try:
                EvaluationSubmissionService.submit_evaluation(
                    student_user=e.student.user_account,
                    campaign=campaign,
                    course=e.course,
                    responses_data=responses_data,
                )
                count += 1
            except Exception:
                continue
        return count
