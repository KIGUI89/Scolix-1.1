import csv
import secrets
import string
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authentication.models import User
from apps.sync.models import TeacherSync, StudentSync


class Command(BaseCommand):
    help = "Génère les comptes utilisateurs à partir des enseignants et étudiants ERP simulés."

    def add_arguments(self, parser):
        parser.add_argument(
            "--role",
            choices=["all", "teachers", "students"],
            default="all",
            help="Type de comptes à générer.",
        )
        parser.add_argument(
            "--output",
            default="exports/generated_accounts.csv",
            help="Chemin du fichier CSV contenant les accès générés.",
        )
        parser.add_argument(
            "--overwrite-password",
            action="store_true",
            help="Réinitialise aussi le mot de passe des comptes déjà existants.",
        )

    def handle(self, *args, **options):
        role = options["role"]
        output_path = Path(settings.BASE_DIR) / options["output"]
        overwrite_password = options["overwrite_password"]

        output_path.parent.mkdir(parents=True, exist_ok=True)

        generated_accounts = []

        with transaction.atomic():
            if role in ["all", "teachers"]:
                generated_accounts += self.generate_teacher_accounts(overwrite_password)

            if role in ["all", "students"]:
                generated_accounts += self.generate_student_accounts(overwrite_password)

        self.write_csv(output_path, generated_accounts)

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(generated_accounts)} compte(s) traité(s). Fichier généré : {output_path}"
            )
        )

    def generate_teacher_accounts(self, overwrite_password):
        accounts = []
        teachers = TeacherSync.objects.filter(is_active=True)

        for teacher in teachers:
            email = teacher.email.strip().lower()
            password = self.generate_password(teacher.matricule)

            user = User.objects.filter(email=email).first()
            created = user is None

            if created:
                user = User(
                    email=email,
                    role=User.Role.TEACHER,
                    teacher_profile=teacher,
                    student_profile=None,
                    is_active=True,
                    is_verified=True,
                )
                user.set_password(password)
                user.save()
                status = "created"

            elif overwrite_password:
                user.role = User.Role.TEACHER
                user.teacher_profile = teacher
                user.student_profile = None
                user.is_active = True
                user.is_verified = True
                user.set_password(password)
                user.save()
                status = "password_reset"

            else:
                password = "UNCHANGED"
                status = "already_exists"

            accounts.append({
                "type": "TEACHER",
                "full_name": teacher.full_name,
                "email": email,
                "password": password,
                "profile_id": str(teacher.id),
                "status": status,
            })

        return accounts

    def generate_student_accounts(self, overwrite_password):
        accounts = []
        students = StudentSync.objects.filter(is_active=True)

        for student in students:
            email = student.email.strip().lower()
            password = self.generate_password(student.student_code)

            user = User.objects.filter(email=email).first()
            created = user is None

            if created:
                user = User(
                    email=email,
                    role=User.Role.STUDENT,
                    teacher_profile=None,
                    student_profile=student,
                    is_active=True,
                    is_verified=True,
                )
                user.set_password(password)
                user.save()
                status = "created"

            elif overwrite_password:
                user.role = User.Role.STUDENT
                user.teacher_profile = None
                user.student_profile = student
                user.is_active = True
                user.is_verified = True
                user.set_password(password)
                user.save()
                status = "password_reset"

            else:
                password = "UNCHANGED"
                status = "already_exists"

            accounts.append({
                "type": "STUDENT",
                "full_name": student.full_name,
                "email": email,
                "password": password,
                "profile_id": str(student.id),
                "status": status,
            })

        return accounts

    def generate_password(self, reference_code):
        random_part = "".join(
            secrets.choice(string.ascii_letters + string.digits)
            for _ in range(6)
        )

        clean_code = str(reference_code).replace("-", "")[-4:]

        return f"Edu@{clean_code}{random_part}"

    def write_csv(self, output_path, accounts):
        with open(output_path, mode="w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(
                file,
                fieldnames=[
                    "type",
                    "full_name",
                    "email",
                    "password",
                    "profile_id",
                    "status",
                ],
            )
            writer.writeheader()
            writer.writerows(accounts)