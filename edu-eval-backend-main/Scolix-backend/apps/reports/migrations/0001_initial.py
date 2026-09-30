import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="ReportRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("report_type", models.CharField(choices=[("TEACHER_SUMMARY","Rapport enseignant"),("CAMPAIGN_RESULTS","Résultats campagne"),("ATTENDANCE","Rapport présences"),("RANKING","Classement enseignants")], max_length=30)),
                ("format", models.CharField(choices=[("PDF","PDF"),("EXCEL","Excel"),("CSV","CSV")], default="PDF", max_length=10)),
                ("status", models.CharField(choices=[("PENDING","En attente"),("GENERATING","En génération"),("DONE","Terminé"),("FAILED","Échoué")], default="PENDING", max_length=20)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("done_at", models.DateTimeField(blank=True, null=True)),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="report_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "report_requests", "ordering": ["-created_at"]},
        ),
    ]
