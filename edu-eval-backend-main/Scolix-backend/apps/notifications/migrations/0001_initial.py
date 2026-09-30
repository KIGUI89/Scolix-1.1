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
            name="Notification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("notif_type", models.CharField(choices=[("CAMPAIGN_OPEN","Campagne ouverte"),("CAMPAIGN_REMINDER","Rappel d'évaluation"),("CAMPAIGN_CLOSED","Campagne clôturée"),("ATTENDANCE_ALERT","Alerte ponctualité"),("SCORE_PUBLISHED","Scores publiés"),("SYSTEM","Système")], max_length=30)),
                ("channel", models.CharField(choices=[("EMAIL","Email"),("IN_APP","In-App")], default="IN_APP", max_length=20)),
                ("status", models.CharField(choices=[("PENDING","En attente"),("SENT","Envoyée"),("FAILED","Échouée"),("READ","Lue")], default="PENDING", max_length=20)),
                ("title", models.CharField(max_length=200)),
                ("message", models.TextField()),
                ("related_resource", models.CharField(blank=True, max_length=100, null=True)),
                ("related_resource_id", models.CharField(blank=True, max_length=100, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "notifications", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="notification", index=models.Index(fields=["recipient"], name="notif_recipient_idx")),
        migrations.AddIndex(model_name="notification", index=models.Index(fields=["status"], name="notif_status_idx")),
        migrations.AddIndex(model_name="notification", index=models.Index(fields=["notif_type"], name="notif_type_idx")),
    ]
