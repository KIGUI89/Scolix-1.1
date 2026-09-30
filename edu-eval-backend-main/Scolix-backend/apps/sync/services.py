from django.db import transaction
from django.utils import timezone

from .models import AcademicSemester


class SemesterService:
    @staticmethod
    @transaction.atomic
    def sync_statuses():
        """
        Désactive les semestres actifs dont la date de fin est dépassée,
        puis active celui (s'il existe) dont la période couvre aujourd'hui.
        Garantit qu'à tout instant au plus un semestre est actif, sans
        intervention manuelle.
        """
        today = timezone.localdate()

        deactivated_ids = list(
            AcademicSemester.objects.filter(
                is_active=True, end_date__lt=today,
            ).values_list("id", flat=True)
        )
        if deactivated_ids:
            AcademicSemester.objects.filter(id__in=deactivated_ids).update(is_active=False)
            # Bascule actif → inactif = déclencheur du réentraînement des
            # modèles IA/biais (pas de scheduler séparé dans ce projet).
            transaction.on_commit(lambda: SemesterService._retrain_after_deactivation(deactivated_ids))

        AcademicSemester.objects.filter(
            is_active=False, start_date__lte=today, end_date__gte=today,
        ).update(is_active=True)

    @staticmethod
    def _retrain_after_deactivation(semester_ids):
        from apps.ai_engine.services import ModelTrainingService
        ModelTrainingService.retrain_for_semesters(semester_ids)
