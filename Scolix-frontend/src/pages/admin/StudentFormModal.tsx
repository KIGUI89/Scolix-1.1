import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createEnrollment, createStudent, listDepartments, updateStudent, type StudentInput } from "../../services/sync";
import { CourseEnrollPicker } from "./CourseEnrollPicker";
import { ACADEMIC_LEVELS } from "../../lib/academicLevels";
import type { Student } from "../../types/sync";

const LEVELS = ACADEMIC_LEVELS;

interface StudentFormModalProps {
  /** Omit to create a new student instead of editing an existing one. */
  student?: Student;
  defaultLevel?: string;
  defaultDepartment?: string;
  onClose: () => void;
}

export function StudentFormModal({ student, defaultLevel, defaultDepartment, onClose }: StudentFormModalProps) {
  const qc = useQueryClient();
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });

  const [form, setForm] = useState<StudentInput>({
    first_name: student?.first_name ?? "",
    last_name: student?.last_name ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    department: student?.department ?? defaultDepartment ?? "",
    level: student?.level ?? defaultLevel ?? LEVELS[0].code,
    cohort: student?.cohort ?? "",
    academic_year: student?.academic_year ?? "",
    is_active: student?.is_active ?? true,
    university_id: student?.university_id ?? "",
    student_code: student?.student_code ?? "",
  });
  const [enroll, setEnroll] = useState(false);
  const [enrollCourseIds, setEnrollCourseIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (student) {
        return updateStudent(student.id, form);
      }
      const created = await createStudent(form);
      if (enroll && enrollCourseIds.length > 0) {
        await Promise.all(enrollCourseIds.map((courseId) => createEnrollment({ student: created.id, course: courseId, is_active: true })));
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["students-list"] });
      qc.invalidateQueries({ queryKey: ["students-departments-by-level"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Vérifiez les champs (e-mail/matricule doivent être uniques)."),
  });

  function set<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title={student ? "Modifier l'étudiant" : "Nouvel étudiant"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Prénom</label>
            <input className="input" required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </div>
          <div className="field">
            <label>Nom</label>
            <input className="input" required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Matricule</label>
            <input className="input" required value={form.student_code} onChange={(e) => set("student_code", e.target.value)} />
          </div>
          <div className="field">
            <label>Identifiant ERP</label>
            <input className="input" required value={form.university_id} onChange={(e) => set("university_id", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Niveau</label>
            <select className="input" required value={form.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Filière</label>
            <select className="input" required value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Promotion</label>
            <input className="input" value={form.cohort} onChange={(e) => set("cohort", e.target.value)} />
          </div>
          <div className="field">
            <label>Année académique</label>
            <input className="input" value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} />
          </div>
        </div>
        <label className="radio">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Compte actif
        </label>

        {!student && (
          <>
            <label className="radio">
              <input
                type="checkbox"
                checked={enroll}
                onChange={(e) => {
                  setEnroll(e.target.checked);
                  if (!e.target.checked) setEnrollCourseIds([]);
                }}
              />
              Enrôler l'étudiant dans un cours
            </label>
            {enroll && (
              <div style={{ padding: 12, background: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
                <CourseEnrollPicker
                  departmentId={form.department}
                  courseIds={enrollCourseIds}
                  onDepartmentChange={() => {}}
                  onCourseIdsChange={setEnrollCourseIds}
                  lockDepartment
                />
              </div>
            )}
          </>
        )}

        {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-secondary" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
