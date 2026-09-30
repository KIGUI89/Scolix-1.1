import django.utils.timezone
import uuid
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="ClusteringResult",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("semester_id", models.UUIDField(blank=True, null=True)),
                ("k", models.PositiveSmallIntegerField(default=3)),
                ("clusters", models.JSONField()),
                ("computed_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={"db_table": "ai_clustering_results", "ordering": ["-computed_at"]},
        ),
        migrations.CreateModel(
            name="BiasDetectionResult",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("semester_id", models.UUIDField(blank=True, null=True)),
                ("results", models.JSONField()),
                ("computed_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={"db_table": "ai_bias_detection_results", "ordering": ["-computed_at"]},
        ),
    ]
