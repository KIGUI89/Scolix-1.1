from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0004_migrate_grade_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='teachersync',
            name='grade',
        ),
        migrations.RenameField(
            model_name='teachersync',
            old_name='grade_fk',
            new_name='grade',
        ),
    ]