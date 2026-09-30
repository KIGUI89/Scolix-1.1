from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0008_backfill_student_academic_year'),
    ]

    operations = [
        migrations.AlterField(
            model_name='studentsync',
            name='academic_year',
            field=models.CharField(max_length=20),
        ),
    ]
