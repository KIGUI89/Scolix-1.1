from django.core.management.base import BaseCommand

from apps.sync.services import SemesterService


class Command(BaseCommand):
    help = (
        "Corrige le statut actif/inactif des semestres académiques selon leurs "
        "dates. Déjà exécuté automatiquement à chaque lecture de la liste des "
        "semestres via l'API ; cette commande est utile si on veut aussi la "
        "brancher sur une tâche planifiée (cron, Planificateur de tâches "
        "Windows) pour une bascule même en l'absence de trafic sur l'app."
    )

    def handle(self, *args, **options):
        SemesterService.sync_statuses()
        self.stdout.write(self.style.SUCCESS("Statuts des semestres synchronisés."))
