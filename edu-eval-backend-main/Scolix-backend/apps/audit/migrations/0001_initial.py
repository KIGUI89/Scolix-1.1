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
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(choices=[("CREATE","Création"),("UPDATE","Modification"),("DELETE","Suppression"),("LOGIN","Connexion"),("LOGOUT","Déconnexion"),("EXPORT","Export"),("ACCESS","Accès")], max_length=20)),
                ("resource", models.CharField(max_length=100)),
                ("resource_id", models.CharField(blank=True, max_length=100, null=True)),
                ("detail", models.TextField(blank=True, null=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True, null=True)),
                ("timestamp", models.DateTimeField(default=django.utils.timezone.now)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "audit_logs", "ordering": ["-timestamp"]},
        ),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["user"], name="audit_user_idx")),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["action"], name="audit_action_idx")),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["resource"], name="audit_resource_idx")),
        migrations.AddIndex(model_name="auditlog", index=models.Index(fields=["timestamp"], name="audit_ts_idx")),
    ]
