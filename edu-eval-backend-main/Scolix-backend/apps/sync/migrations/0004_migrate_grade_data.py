from django.db import migrations

# UUIDs fixes : partagés avec fixtures/erp_seed_all.json pour que le seed ERP
# et cette migration de données pointent vers les mêmes lignes Grade.
GRADES = [
    ("b9ad0b57-8a4b-488f-9161-477d07403b1d", "Professeur", 1),
    ("54a32684-3004-4f25-a85d-db040694cc12", "Maître de Conférences", 2),
    ("7c1ecad6-fd5f-4587-94fd-7bcf29b17eac", "Maître Assistant", 3),
    ("08da95bc-5353-4e84-a608-5d9cf9ef65c9", "Assistant", 4),
    ("46b8ef25-0c05-4669-9b9a-1a322c9d82d3", "Docteur", 5),
    ("c66f79b1-26ec-4c12-b4c7-781615e902ed", "Ingénieur Enseignant", 6),
    ("a425232a-dc6f-436b-988b-9b6a59721ed3", "Vacataire", 7),
]


def seed_grades(apps, schema_editor):
    Grade = apps.get_model('sync', 'Grade')
    TeacherSync = apps.get_model('sync', 'TeacherSync')

    grades_by_name = {}
    for grade_id, name, rank_order in GRADES:
        grade, _ = Grade.objects.get_or_create(
            id=grade_id,
            defaults={"name": name, "rank_order": rank_order},
        )
        grades_by_name[name] = grade

    next_rank = len(GRADES) + 1
    for teacher in TeacherSync.objects.all():
        raw_grade = (teacher.grade or "").strip()
        if not raw_grade:
            continue
        grade = grades_by_name.get(raw_grade)
        if grade is None:
            grade = Grade.objects.create(name=raw_grade, rank_order=next_rank)
            grades_by_name[raw_grade] = grade
            next_rank += 1
        teacher.grade_fk = grade
        teacher.save(update_fields=["grade_fk"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0003_grade'),
    ]

    operations = [
        migrations.RunPython(seed_grades, noop),
    ]