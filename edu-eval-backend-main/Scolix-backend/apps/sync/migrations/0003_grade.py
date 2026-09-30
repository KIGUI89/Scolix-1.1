import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0002_studentcourseenrollment_created_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Grade',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('synced_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('rank_order', models.PositiveIntegerField(default=0, help_text='Position dans la hiérarchie académique (0 = plus haut grade).')),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'db_table': 'sync_grades',
                'ordering': ['rank_order', 'name'],
            },
        ),
        migrations.AddField(
            model_name='teachersync',
            name='grade_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='teachers', to='sync.grade'),
        ),
    ]