from django.db import migrations

# Catalogue complet des grades académiques (corps enseignant-chercheur,
# hiérarchie CAMES) + statuts d'enseignement courants en informatique.
# UUIDs fixes : partagés avec fixtures/erp_seed_all.json.
GRADES = [
    ("f1e17d05-ceae-46cb-90d7-eceee2c5173c", "Professeur Titulaire", 1),
    ("b9ad0b57-8a4b-488f-9161-477d07403b1d", "Professeur", 2),
    ("54a32684-3004-4f25-a85d-db040694cc12", "Maître de Conférences", 3),
    ("7c1ecad6-fd5f-4587-94fd-7bcf29b17eac", "Maître Assistant", 4),
    ("1f7e176f-e647-4f7e-b1a4-6fa69135428e", "Chargé de Cours", 5),
    ("08da95bc-5353-4e84-a608-5d9cf9ef65c9", "Assistant", 6),
    ("129be98f-2a2e-4844-8dc8-f1a3dbb14cfc", "Attaché Temporaire d'Enseignement et de Recherche (ATER)", 7),
    ("46b8ef25-0c05-4669-9b9a-1a322c9d82d3", "Docteur", 8),
    ("343cc12e-87ab-4e4f-a15f-3045bd5f8dc3", "Doctorant Enseignant", 9),
    ("c66f79b1-26ec-4c12-b4c7-781615e902ed", "Ingénieur Enseignant", 10),
    ("a425232a-dc6f-436b-988b-9b6a59721ed3", "Vacataire", 11),
]


def expand_grades(apps, schema_editor):
    Grade = apps.get_model('sync', 'Grade')
    for grade_id, name, rank_order in GRADES:
        Grade.objects.update_or_create(
            id=grade_id,
            defaults={"name": name, "rank_order": rank_order},
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0005_swap_grade_field'),
    ]

    operations = [
        migrations.RunPython(expand_grades, noop),
    ]
