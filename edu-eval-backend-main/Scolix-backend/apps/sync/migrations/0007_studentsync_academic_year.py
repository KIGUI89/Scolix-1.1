from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0006_expand_grade_catalog'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentsync',
            name='academic_year',
            field=models.CharField(max_length=20, null=True, blank=True),
        ),
    ]
