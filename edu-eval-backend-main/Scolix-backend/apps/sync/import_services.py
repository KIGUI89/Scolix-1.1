"""
Assistant d'import manuel (upload → mapping → validation → import).

Réutilise volontairement les serializers DRF déjà utilisés par les écrans
CRUD (TeacherSyncSerializer, etc.) pour la validation ligne à ligne : un
enregistrement importé passe exactement par les mêmes règles qu'un
enregistrement saisi à la main, sans dupliquer la logique métier.
"""
import csv
import io
import re
import unicodedata
from difflib import SequenceMatcher

import openpyxl
from django.db import transaction
from django.utils import timezone

from .models import (
    AcademicSemester,
    CourseSync,
    Department,
    Grade,
    ImportBatch,
    StudentCourseEnrollment,
    StudentSync,
    SyncLog,
    TeacherSync,
)
from .serializers import (
    CourseSyncSerializer,
    StudentCourseEnrollmentSerializer,
    StudentSyncSerializer,
    TeacherSyncSerializer,
)

MAX_ROWS = 5000


class ImportError_(Exception):
    """Erreur utilisateur (fichier invalide, etc.) — distincte des erreurs de validation par ligne."""


# ── Parsing du fichier ──────────────────────────────────────────────────────

def parse_uploaded_file(uploaded_file):
    """Retourne (headers: list[str], rows: list[dict[str, str]])."""
    name = (uploaded_file.name or "").lower()

    if name.endswith(".csv"):
        content = uploaded_file.read().decode("utf-8-sig")
        rows_raw = list(csv.reader(io.StringIO(content)))
    elif name.endswith(".xlsx"):
        workbook = openpyxl.load_workbook(uploaded_file, data_only=True, read_only=True)
        sheet = workbook.active
        rows_raw = [
            ["" if cell is None else str(cell) for cell in row]
            for row in sheet.iter_rows(values_only=True)
        ]
    else:
        raise ImportError_("Format de fichier non supporté — utilisez un fichier .csv ou .xlsx.")

    rows_raw = [r for r in rows_raw if any(str(c).strip() for c in r)]
    if not rows_raw:
        raise ImportError_("Le fichier est vide.")
    if len(rows_raw) - 1 > MAX_ROWS:
        raise ImportError_(f"Le fichier dépasse la limite de {MAX_ROWS} lignes pour un import manuel.")

    headers = [str(h).strip() for h in rows_raw[0]]
    rows = []
    for raw in rows_raw[1:]:
        rows.append({h: (str(raw[i]).strip() if i < len(raw) and raw[i] is not None else "") for i, h in enumerate(headers)})
    return headers, rows


# ── Suggestion de mapping des colonnes ──────────────────────────────────────

def _normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


FIELD_SYNONYMS = {
    ImportBatch.EntityType.TEACHER: {
        "university_id": ["idexterne", "identifiantuniversitaire", "erpid", "identifiant"],
        "matricule": ["matricule"],
        "first_name": ["prenom", "firstname"],
        "last_name": ["nom", "lastname", "nomens"],
        "email": ["email", "mail", "courriel"],
        "phone": ["telephone", "tel", "phone"],
        "department": ["departement", "dept"],
        "grade": ["grade", "rang"],
        "specialty": ["specialite", "specialty"],
    },
    ImportBatch.EntityType.STUDENT: {
        "university_id": ["idexterne", "identifiantuniversitaire"],
        "student_code": ["codeetudiant", "matriculeetudiant", "studentcode"],
        "first_name": ["prenom", "firstname"],
        "last_name": ["nom", "lastname"],
        "email": ["email", "mail", "courriel"],
        "phone": ["telephone", "tel", "phone"],
        "department": ["departement", "dept"],
        "level": ["niveau", "level"],
        "cohort": ["promotion", "cohort", "groupe"],
        "academic_year": ["anneeuniversitaire", "annee", "academicyear"],
    },
    ImportBatch.EntityType.COURSE: {
        "university_id": ["idexterne", "identifiantuniversitaire"],
        "code": ["code", "codecours"],
        "name": ["nom", "intitule"],
        "description": ["description"],
        "teacher": ["enseignant", "matriculeenseignant"],
        "department": ["departement", "dept"],
        "semester": ["semestre"],
        "grade": ["grade"],
        "level": ["niveau", "level"],
        "cohort": ["promotion", "cohort"],
        "credit": ["credit", "credits"],
    },
    ImportBatch.EntityType.ENROLLMENT: {
        "student": ["codeetudiant", "matriculeetudiant"],
        "course": ["codecours"],
    },
}

REQUIRED_FIELDS = {
    ImportBatch.EntityType.TEACHER: ["university_id", "matricule", "first_name", "last_name", "email", "department"],
    ImportBatch.EntityType.STUDENT: [
        "university_id", "student_code", "first_name", "last_name", "email",
        "department", "level", "cohort", "academic_year",
    ],
    ImportBatch.EntityType.COURSE: [
        "university_id", "code", "name", "teacher", "department", "semester", "level", "cohort", "credit",
    ],
    ImportBatch.EntityType.ENROLLMENT: ["student", "course"],
}

OPTIONAL_FIELDS = {
    ImportBatch.EntityType.TEACHER: ["phone", "grade", "specialty"],
    ImportBatch.EntityType.STUDENT: ["phone"],
    ImportBatch.EntityType.COURSE: ["description", "grade"],
    ImportBatch.EntityType.ENROLLMENT: [],
}


def target_fields(entity_type: str) -> list[str]:
    return REQUIRED_FIELDS[entity_type] + OPTIONAL_FIELDS[entity_type]


def suggest_mapping(entity_type: str, headers: list[str]) -> dict:
    """Retourne {header: {"field": str | None, "confidence": int 0-100}}."""
    synonyms = FIELD_SYNONYMS[entity_type]
    result = {}
    used_fields = set()

    for header in headers:
        nh = _normalize(header)
        best_field, best_score = None, 0.0
        for field, syns in synonyms.items():
            if field in used_fields:
                continue
            for candidate in [field, *syns]:
                nc = _normalize(candidate)
                score = 1.0 if nh == nc else SequenceMatcher(None, nh, nc).ratio()
                if score > best_score:
                    best_field, best_score = field, score

        if best_field and best_score >= 0.6:
            result[header] = {"field": best_field, "confidence": round(best_score * 100)}
            used_fields.add(best_field)
        else:
            result[header] = {"field": None, "confidence": 0}

    return result


# ── Résolution des clés étrangères ──────────────────────────────────────────

def _resolve_by_natural_key(model, lookup_field: str, raw_value: str, label: str):
    raw_value = (raw_value or "").strip()
    if not raw_value:
        return None, f"{label} manquant"
    matches = list(model.objects.filter(**{f"{lookup_field}__iexact": raw_value})[:2])
    if not matches:
        return None, f"{label} « {raw_value} » introuvable"
    if len(matches) > 1:
        return None, f"{label} « {raw_value} » ambigu (plusieurs correspondances)"
    return matches[0], None


def _resolve_semester(raw_value: str):
    raw_value = (raw_value or "").strip()
    if not raw_value:
        return None, "Semestre manquant"

    exact = list(AcademicSemester.objects.filter(name__iexact=raw_value))
    if len(exact) == 1:
        return exact[0], None
    if len(exact) > 1:
        for s in exact:
            if s.academic_year in raw_value:
                return s, None
        return None, f"Semestre « {raw_value} » ambigu — précisez l'année académique (ex. « {exact[0].name} ({exact[0].academic_year}) »)"

    for s in AcademicSemester.objects.all():
        if raw_value.lower() in (f"{s.name} ({s.academic_year})".lower(), f"{s.name} {s.academic_year}".lower()):
            return s, None

    return None, f"Semestre « {raw_value} » introuvable"


# ── Construction du payload par type d'entité ───────────────────────────────

def _build_payload(entity_type: str, mapped: dict) -> tuple[dict, list[tuple[str, str]]]:
    """Retourne (payload prêt pour le serializer, [(champ, message)] erreurs de résolution)."""
    errors: list[tuple[str, str]] = []

    if entity_type == ImportBatch.EntityType.TEACHER:
        payload = {f: (mapped.get(f) or None) for f in ["university_id", "matricule", "first_name", "last_name", "email", "phone", "specialty"]}
        dept, err = _resolve_by_natural_key(Department, "code", mapped.get("department", ""), "Département")
        if err:
            errors.append(("department", err))
        else:
            payload["department"] = str(dept.id)
        grade_raw = mapped.get("grade")
        if grade_raw:
            grade, err = _resolve_by_natural_key(Grade, "name", grade_raw, "Grade")
            if err:
                errors.append(("grade", err))
            else:
                payload["grade"] = str(grade.id)
        return payload, errors

    if entity_type == ImportBatch.EntityType.STUDENT:
        payload = {f: (mapped.get(f) or None) for f in [
            "university_id", "student_code", "first_name", "last_name", "email", "phone", "level", "cohort", "academic_year",
        ]}
        dept, err = _resolve_by_natural_key(Department, "code", mapped.get("department", ""), "Département")
        if err:
            errors.append(("department", err))
        else:
            payload["department"] = str(dept.id)
        return payload, errors

    if entity_type == ImportBatch.EntityType.COURSE:
        payload = {f: (mapped.get(f) or None) for f in ["university_id", "code", "name", "description", "level", "cohort", "credit"]}
        if payload.get("credit"):
            try:
                payload["credit"] = int(payload["credit"])
            except ValueError:
                errors.append(("credit", f"Crédit « {payload['credit']} » n'est pas un nombre"))
                payload["credit"] = None
        teacher, err = _resolve_by_natural_key(TeacherSync, "matricule", mapped.get("teacher", ""), "Enseignant")
        if err:
            errors.append(("teacher", err))
        else:
            payload["teacher"] = str(teacher.id)
        dept, err = _resolve_by_natural_key(Department, "code", mapped.get("department", ""), "Département")
        if err:
            errors.append(("department", err))
        else:
            payload["department"] = str(dept.id)
        semester, err = _resolve_semester(mapped.get("semester", ""))
        if err:
            errors.append(("semester", err))
        else:
            payload["semester"] = str(semester.id)
        grade_raw = mapped.get("grade")
        if grade_raw:
            grade, err = _resolve_by_natural_key(Grade, "name", grade_raw, "Grade")
            if err:
                errors.append(("grade", err))
            else:
                payload["grade"] = str(grade.id)
        return payload, errors

    if entity_type == ImportBatch.EntityType.ENROLLMENT:
        payload = {}
        student, err = _resolve_by_natural_key(StudentSync, "student_code", mapped.get("student", ""), "Étudiant")
        if err:
            errors.append(("student", err))
        else:
            payload["student"] = str(student.id)
        course, err = _resolve_by_natural_key(CourseSync, "code", mapped.get("course", ""), "Cours")
        if err:
            errors.append(("course", err))
        else:
            payload["course"] = str(course.id)
        return payload, errors

    raise ImportError_(f"Type d'entité inconnu : {entity_type}")


NATURAL_KEY_FIELD = {
    ImportBatch.EntityType.TEACHER: "matricule",
    ImportBatch.EntityType.STUDENT: "student_code",
    ImportBatch.EntityType.COURSE: "code",
}
MODEL_BY_TYPE = {
    ImportBatch.EntityType.TEACHER: TeacherSync,
    ImportBatch.EntityType.STUDENT: StudentSync,
    ImportBatch.EntityType.COURSE: CourseSync,
    ImportBatch.EntityType.ENROLLMENT: StudentCourseEnrollment,
}
SERIALIZER_BY_TYPE = {
    ImportBatch.EntityType.TEACHER: TeacherSyncSerializer,
    ImportBatch.EntityType.STUDENT: StudentSyncSerializer,
    ImportBatch.EntityType.COURSE: CourseSyncSerializer,
    ImportBatch.EntityType.ENROLLMENT: StudentCourseEnrollmentSerializer,
}


def _existing_instance(entity_type: str, payload: dict):
    if entity_type == ImportBatch.EntityType.ENROLLMENT:
        if payload.get("student") and payload.get("course"):
            return StudentCourseEnrollment.objects.filter(student_id=payload["student"], course_id=payload["course"]).first()
        return None
    key_field = NATURAL_KEY_FIELD[entity_type]
    key_value = payload.get(key_field)
    if not key_value:
        return None
    return MODEL_BY_TYPE[entity_type].objects.filter(**{key_field: key_value}).first()


def validate_rows(entity_type: str, rows: list[dict], mapping: dict) -> dict:
    """
    Applique le mapping {header: field|None} à chaque ligne brute, résout les
    clés étrangères, puis valide via le serializer DRF de l'entité — les
    mêmes règles que les écrans CRUD manuels.
    """
    header_to_field = {h: v for h, v in mapping.items() if v}
    seen_keys: dict[str, int] = {}
    results = []

    for index, raw_row in enumerate(rows):
        row_number = index + 2  # +1 pour l'en-tête, +1 pour l'indexation 1-based
        mapped = {}
        for header, value in raw_row.items():
            field = header_to_field.get(header)
            if field:
                mapped[field] = value

        payload, resolution_errors = _build_payload(entity_type, mapped)
        errors = list(resolution_errors)

        natural_key = None
        if entity_type != ImportBatch.EntityType.ENROLLMENT:
            key_field = NATURAL_KEY_FIELD[entity_type]
            natural_key = mapped.get(key_field)
            if natural_key:
                if natural_key in seen_keys:
                    errors.append((key_field, f"Doublon dans le fichier avec la ligne {seen_keys[natural_key]}"))
                else:
                    seen_keys[natural_key] = row_number

        instance = _existing_instance(entity_type, payload) if not errors else None
        action = "update" if instance else "create"

        if not errors:
            serializer = SERIALIZER_BY_TYPE[entity_type](instance=instance, data=payload, partial=False)
            if not serializer.is_valid():
                for field, messages in serializer.errors.items():
                    for m in messages:
                        errors.append((field, str(m)))

        results.append({
            "row": row_number,
            "natural_key": natural_key,
            "action": action if not errors else None,
            "errors": [{"field": f, "message": m} for f, m in errors],
            "payload": payload if not errors else None,
        })

    valid_count = sum(1 for r in results if not r["errors"])
    error_count = len(results) - valid_count

    anomalies: dict[tuple, dict] = {}
    for r in results:
        for e in r["errors"]:
            key = (e["field"], e["message"].split("«")[0].strip())
            group = anomalies.setdefault(key, {"field": e["field"], "message": e["message"], "rows": []})
            group["rows"].append(r["row"])

    return {
        "total": len(results),
        "valid_count": valid_count,
        "error_count": error_count,
        "rows": results,
        "anomalies": sorted(anomalies.values(), key=lambda a: -len(a["rows"])),
    }


# ── Commit ───────────────────────────────────────────────────────────────

def commit_batch(batch: ImportBatch, ignore_errors: bool, user) -> dict:
    validation = validate_rows(batch.entity_type, batch.rows, batch.mapping)

    if validation["error_count"] and not ignore_errors:
        raise ImportError_("Des lignes contiennent des anomalies — corrigez-les ou activez l'import partiel.")

    created = updated = 0
    with transaction.atomic():
        for r in validation["rows"]:
            if r["errors"]:
                continue
            model = MODEL_BY_TYPE[batch.entity_type]
            serializer_cls = SERIALIZER_BY_TYPE[batch.entity_type]

            if batch.entity_type == ImportBatch.EntityType.ENROLLMENT:
                instance = StudentCourseEnrollment.objects.filter(
                    student_id=r["payload"]["student"], course_id=r["payload"]["course"],
                ).first()
            else:
                key_field = NATURAL_KEY_FIELD[batch.entity_type]
                instance = model.objects.filter(**{key_field: r["payload"][key_field]}).first()

            serializer = serializer_cls(instance=instance, data=r["payload"], partial=False)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            updated += 1 if instance else 0
            created += 0 if instance else 1

    counts_field = {
        ImportBatch.EntityType.TEACHER: "teachers_count",
        ImportBatch.EntityType.STUDENT: "students_count",
        ImportBatch.EntityType.COURSE: "courses_count",
        ImportBatch.EntityType.ENROLLMENT: "enrollments_count",
    }[batch.entity_type]

    if validation["error_count"] == 0:
        status = SyncLog.SyncStatus.SUCCESS
    elif created + updated > 0:
        status = SyncLog.SyncStatus.PARTIAL
    else:
        status = SyncLog.SyncStatus.FAILED

    log = SyncLog.objects.create(
        sync_type=SyncLog.SyncType.MANUAL,
        status=status,
        entity_type=batch.entity_type,
        source_filename=batch.original_filename,
        message=f"{created} créé(s), {updated} mis à jour, {validation['error_count']} ignoré(s) sur {validation['total']} ligne(s).",
        errors=validation["anomalies"] or None,
        started_at=batch.created_at,
        ended_at=timezone.now(),
        **{counts_field: created + updated},
    )

    batch.status = ImportBatch.Status.COMMITTED
    batch.committed_at = timezone.now()
    batch.validation = validation
    batch.save(update_fields=["status", "committed_at", "validation"])

    return {"created": created, "updated": updated, "skipped": validation["error_count"], "log_id": str(log.id)}
