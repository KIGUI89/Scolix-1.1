from django.db import migrations

FALLBACK_ACADEMIC_YEAR = "2025/2026"


def backfill_academic_year(apps, schema_editor):
    AcademicSemester = apps.get_model('sync', 'AcademicSemester')
    StudentSync = apps.get_model('sync', 'StudentSync')

    semester = AcademicSemester.objects.filter(is_active=True).first()
    if semester is None:
        semester = AcademicSemester.objects.order_by('-start_date').first()

    academic_year = semester.academic_year if semester else FALLBACK_ACADEMIC_YEAR

    StudentSync.objects.filter(academic_year__isnull=True).update(academic_year=academic_year)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0007_studentsync_academic_year'),
    ]

    operations = [
        migrations.RunPython(backfill_academic_year, noop),
    ]
