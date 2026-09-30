from django.core.management.base import BaseCommand

from apps.ai_engine.models import TrainingCatalog
from apps.evaluations.models import EvaluationCriteria


class Command(BaseCommand):
    help = "Crée le catalogue de formations continues par défaut, relié aux catégories de critères."

    DEFAULT_CATALOG = [
        {
            "title": "Atelier pédagogie active et différenciée",
            "description": "Méthodes actives pour dynamiser les séances et clarifier les explications.",
            "category": EvaluationCriteria.Category.PEDAGOGY,
            "provider": TrainingCatalog.Provider.INTERNAL,
        },
        {
            "title": "Certification en pédagogie universitaire",
            "description": "Formation diplômante reconnue sur les fondamentaux de la pédagogie de l'enseignement supérieur.",
            "category": EvaluationCriteria.Category.PEDAGOGY,
            "provider": TrainingCatalog.Provider.EXTERNAL,
            "url": "https://exemple-formation.fr/pedagogie-universitaire",
        },
        {
            "title": "Mise à jour des contenus de cours et veille disciplinaire",
            "description": "Actualisation des supports de cours et des références bibliographiques.",
            "category": EvaluationCriteria.Category.CONTENT,
            "provider": TrainingCatalog.Provider.INTERNAL,
        },
        {
            "title": "MOOC de spécialisation disciplinaire",
            "description": "Parcours en ligne pour approfondir la maîtrise du contenu enseigné.",
            "category": EvaluationCriteria.Category.CONTENT,
            "provider": TrainingCatalog.Provider.EXTERNAL,
            "url": "https://exemple-formation.fr/mooc-specialisation",
        },
        {
            "title": "Atelier posture et relation enseignant-étudiant",
            "description": "Communication bienveillante et gestion des interactions en salle de classe.",
            "category": EvaluationCriteria.Category.BEHAVIOR,
            "provider": TrainingCatalog.Provider.INTERNAL,
        },
        {
            "title": "Certification en gestion de classe",
            "description": "Techniques de gestion de groupe et de résolution de tensions en contexte académique.",
            "category": EvaluationCriteria.Category.BEHAVIOR,
            "provider": TrainingCatalog.Provider.EXTERNAL,
            "url": "https://exemple-formation.fr/gestion-de-classe",
        },
        {
            "title": "Organisation des permanences et suivi étudiant",
            "description": "Mise en place d'un dispositif structuré de disponibilité hors cours.",
            "category": EvaluationCriteria.Category.AVAILABILITY,
            "provider": TrainingCatalog.Provider.INTERNAL,
        },
        {
            "title": "Outils numériques de suivi et de réponse aux étudiants",
            "description": "Plateformes et bonnes pratiques pour raccourcir les délais de réponse.",
            "category": EvaluationCriteria.Category.AVAILABILITY,
            "provider": TrainingCatalog.Provider.EXTERNAL,
            "url": "https://exemple-formation.fr/outils-suivi-etudiant",
        },
        {
            "title": "Atelier planification pédagogique et gestion du temps",
            "description": "Structuration du programme de cours et respect de la progression annoncée.",
            "category": EvaluationCriteria.Category.ORGANIZATION,
            "provider": TrainingCatalog.Provider.INTERNAL,
        },
        {
            "title": "Certification en gestion de projet pédagogique",
            "description": "Méthodes de planification et de pilotage appliquées à l'enseignement.",
            "category": EvaluationCriteria.Category.ORGANIZATION,
            "provider": TrainingCatalog.Provider.EXTERNAL,
            "url": "https://exemple-formation.fr/gestion-projet-pedagogique",
        },
    ]

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for item in self.DEFAULT_CATALOG:
            _, created = TrainingCatalog.objects.update_or_create(
                title=item["title"],
                defaults={
                    "description": item["description"],
                    "category":    item["category"],
                    "provider":    item["provider"],
                    "url":         item.get("url"),
                    "is_active":   True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Formations créées : {created_count} | Formations mises à jour : {updated_count}"
            )
        )
