"""
Analytics : la plupart des calculs se font à la volée depuis evaluations +
attendance, sans table dédiée. Seule exception : la configuration des seuils
de classification, qui doit être modifiable par l'administration.
"""
from decimal import Decimal

from django.db import models
from django.utils import timezone


class ClassificationConfig(models.Model):
    """
    Configuration singleton : seuils (en % du global_score, 0-100) de la
    classification à 3 niveaux des enseignants (Exceptionnel / En progression
    / À accompagner), modifiables par l'administration.
    """
    exceptional_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("80"))
    progression_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("60"))
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "analytics_classification_config"

    def save(self, *args, **kwargs):
        self.pk = 1
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Seuils : Exceptionnel > {self.exceptional_threshold}% | En progression > {self.progression_threshold}%"
