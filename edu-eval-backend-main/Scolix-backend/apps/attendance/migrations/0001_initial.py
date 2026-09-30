import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [("sync", "0002_studentcourseenrollment_created_at_and_more")]
    operations = [
        migrations.CreateModel(
            name="AttendanceRecord",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("scheduled_at", models.DateTimeField()),
                ("actual_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("ON_TIME","À l'heure"),("LATE","En retard"),("ABSENT","Absent")], default="ON_TIME", max_length=20)),
                ("delay_minutes", models.PositiveIntegerField(default=0)),
                ("justification", models.TextField(blank=True, null=True)),
                ("is_justified", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("teacher", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to="sync.teachersync")),
                ("course", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to="sync.coursesync")),
            ],
            options={"db_table": "attendance_records", "ordering": ["-scheduled_at"]},
        ),
        migrations.AddIndex(model_name="attendancerecord", index=models.Index(fields=["teacher"], name="att_teacher_idx")),
        migrations.AddIndex(model_name="attendancerecord", index=models.Index(fields=["course"], name="att_course_idx")),
        migrations.AddIndex(model_name="attendancerecord", index=models.Index(fields=["status"], name="att_status_idx")),
        migrations.AddIndex(model_name="attendancerecord", index=models.Index(fields=["scheduled_at"], name="att_sched_idx")),
        migrations.CreateModel(
            name="AttendanceAlert",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("alert_type", models.CharField(choices=[("LATE_THRESHOLD","Seuil de retards dépassé"),("ABSENCE_THRESHOLD","Seuil d'absences dépassé")], max_length=30)),
                ("status", models.CharField(choices=[("PENDING","En attente"),("SENT","Envoyée"),("RESOLVED","Résolue")], default="PENDING", max_length=20)),
                ("period", models.CharField(max_length=10)),
                ("count", models.PositiveIntegerField(default=0)),
                ("message", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("teacher", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_alerts", to="sync.teachersync")),
            ],
            options={"db_table": "attendance_alerts", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="attendancealert", index=models.Index(fields=["teacher"], name="alert_teacher_idx")),
        migrations.AddIndex(model_name="attendancealert", index=models.Index(fields=["status"], name="alert_status_idx")),
        migrations.AddIndex(model_name="attendancealert", index=models.Index(fields=["period"], name="alert_period_idx")),
    ]
