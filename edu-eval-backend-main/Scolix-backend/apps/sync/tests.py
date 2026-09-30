from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authentication.models import User

from .models import AcademicSemester, CourseSync, Department, ImportBatch, StudentCourseEnrollment, StudentSync, SyncLog, TeacherSync


def _csv(rows: list[str]) -> SimpleUploadedFile:
    content = "\n".join(rows).encode("utf-8")
    return SimpleUploadedFile("import.csv", content, content_type="text/csv")


class TeacherImportFlowTests(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(code="INFO", name="Informatique")
        self.admin = User.objects.create_user(email="admin@test.local", password="test-pass-123", role="ADMIN", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def _upload(self, rows):
        return self.client.post(
            "/api/sync/imports/",
            data={"entity_type": "TEACHER", "file": _csv(rows)},
            format="multipart",
        )

    def test_upload_suggests_mapping_and_parses_rows(self):
        res = self._upload([
            "Matricule,Nom,Prenom,Mail,Dept",
            "ENS-001,Meddah,Samir,s.meddah@univ.fr,INFO",
        ])
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data["row_count"], 1)
        self.assertEqual(res.data["mapping"]["Matricule"], "matricule")
        self.assertEqual(res.data["mapping"]["Nom"], "last_name")
        self.assertEqual(res.data["mapping"]["Mail"], "email")
        self.assertEqual(res.data["status"], ImportBatch.Status.UPLOADED)

    def test_full_flow_creates_teacher_and_sync_log(self):
        upload = self._upload([
            "matricule,first_name,last_name,email,department,university_id",
            "ENS-001,Samir,Meddah,s.meddah@univ.fr,INFO,ERP-001",
        ])
        batch_id = upload.data["id"]
        mapping = upload.data["mapping"]

        validate = self.client.post(f"/api/sync/imports/{batch_id}/validate/", data={"mapping": mapping}, format="json")
        self.assertEqual(validate.status_code, 200, validate.content)
        self.assertEqual(validate.data["validation"]["valid_count"], 1)
        self.assertEqual(validate.data["validation"]["error_count"], 0)

        commit = self.client.post(f"/api/sync/imports/{batch_id}/commit/", data={}, format="json")
        self.assertEqual(commit.status_code, 200, commit.content)
        self.assertEqual(commit.data["created"], 1)
        self.assertEqual(commit.data["updated"], 0)

        teacher = TeacherSync.objects.get(matricule="ENS-001")
        self.assertEqual(teacher.email, "s.meddah@univ.fr")
        self.assertEqual(teacher.department_id, self.dept.id)

        log = SyncLog.objects.get(id=commit.data["log_id"])
        self.assertEqual(log.sync_type, SyncLog.SyncType.MANUAL)
        self.assertEqual(log.status, SyncLog.SyncStatus.SUCCESS)
        self.assertEqual(log.entity_type, "TEACHER")
        self.assertEqual(log.teachers_count, 1)

    def test_reimport_same_matricule_updates_instead_of_duplicating(self):
        TeacherSync.objects.create(
            university_id="ERP-001", matricule="ENS-001", first_name="Samir", last_name="Meddah",
            email="old@univ.fr", department=self.dept,
        )
        upload = self._upload([
            "matricule,first_name,last_name,email,department,university_id",
            "ENS-001,Samir,Meddah,new@univ.fr,INFO,ERP-001",
        ])
        batch_id = upload.data["id"]
        mapping = upload.data["mapping"]
        self.client.post(f"/api/sync/imports/{batch_id}/validate/", data={"mapping": mapping}, format="json")
        commit = self.client.post(f"/api/sync/imports/{batch_id}/commit/", data={}, format="json")

        self.assertEqual(commit.data["created"], 0)
        self.assertEqual(commit.data["updated"], 1)
        self.assertEqual(TeacherSync.objects.count(), 1)
        self.assertEqual(TeacherSync.objects.get().email, "new@univ.fr")

    def test_unknown_department_blocks_commit_unless_errors_ignored(self):
        upload = self._upload([
            "matricule,first_name,last_name,email,department,university_id",
            "ENS-001,Samir,Meddah,s.meddah@univ.fr,GHOST,ERP-001",
        ])
        batch_id = upload.data["id"]
        mapping = upload.data["mapping"]
        validate = self.client.post(f"/api/sync/imports/{batch_id}/validate/", data={"mapping": mapping}, format="json")
        self.assertEqual(validate.data["validation"]["error_count"], 1)

        refused = self.client.post(f"/api/sync/imports/{batch_id}/commit/", data={}, format="json")
        self.assertEqual(refused.status_code, 400)
        self.assertEqual(TeacherSync.objects.count(), 0)

        committed = self.client.post(f"/api/sync/imports/{batch_id}/commit/", data={"ignore_errors": True}, format="json")
        self.assertEqual(committed.status_code, 200, committed.content)
        self.assertEqual(committed.data["created"], 0)
        self.assertEqual(committed.data["skipped"], 1)
        self.assertEqual(TeacherSync.objects.count(), 0)

        log = SyncLog.objects.get(id=committed.data["log_id"])
        self.assertEqual(log.status, SyncLog.SyncStatus.FAILED)

    def test_non_admin_forbidden(self):
        teacher_profile = TeacherSync.objects.create(
            university_id="ERP-999", matricule="ENS-999", first_name="Jean", last_name="Dupont",
            email="jean.dupont@univ.fr", department=self.dept,
        )
        teacher_user = User.objects.create_user(
            email="teacher@test.local", password="test-pass-123", role="TEACHER", teacher_profile=teacher_profile,
        )
        self.client.force_authenticate(user=teacher_user)
        res = self._upload(["matricule\nENS-001"])
        self.assertEqual(res.status_code, 403)

    def test_template_download(self):
        res = self.client.get("/api/sync/imports/template/", {"entity_type": "TEACHER"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("matricule", res.content.decode())


class EnrollmentImportFlowTests(TestCase):
    """L'inscription est le seul type dont la clé naturelle est composite et
    dont le semestre est dérivé automatiquement du cours (pas de colonne
    semestre à mapper) — chemin de code distinct des trois autres entités."""

    def setUp(self):
        dept = Department.objects.create(code="INFO", name="Informatique")
        semester = AcademicSemester.objects.create(
            name="Semestre 1", academic_year="2025/2026", start_date="2025-09-01", end_date="2026-01-31", is_active=True,
        )
        teacher = TeacherSync.objects.create(
            university_id="ERP-T1", matricule="ENS-001", first_name="Samir", last_name="Meddah",
            email="s.meddah@univ.fr", department=dept,
        )
        self.course = CourseSync.objects.create(
            university_id="ERP-C1", code="INF301", name="Bases de données", teacher=teacher, department=dept,
            semester=semester, level="L3", cohort="L3-A", credit=4,
        )
        self.student = StudentSync.objects.create(
            university_id="ERP-S1", student_code="ETU-001", first_name="Lina", last_name="Kaci",
            email="lina.kaci@univ.fr", department=dept, level="L3", cohort="L3-A", academic_year="2025/2026",
        )
        admin = User.objects.create_user(email="admin2@test.local", password="test-pass-123", role="ADMIN", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=admin)

    def test_enrollment_import_derives_semester_from_course(self):
        upload = self.client.post(
            "/api/sync/imports/",
            data={"entity_type": "ENROLLMENT", "file": _csv(["student,course", "ETU-001,INF301"])},
            format="multipart",
        )
        self.assertEqual(upload.status_code, 201, upload.content)
        batch_id = upload.data["id"]

        validate = self.client.post(f"/api/sync/imports/{batch_id}/validate/", data={"mapping": upload.data["mapping"]}, format="json")
        self.assertEqual(validate.data["validation"]["valid_count"], 1, validate.data["validation"])

        commit = self.client.post(f"/api/sync/imports/{batch_id}/commit/", data={}, format="json")
        self.assertEqual(commit.status_code, 200, commit.content)
        self.assertEqual(commit.data["created"], 1)

        enrollment = StudentCourseEnrollment.objects.get(student=self.student, course=self.course)
        self.assertEqual(enrollment.semester_id, self.course.semester_id)
