import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { listCourses, listDepartments, listGrades, updateCourse } from "../../services/sync";
import { createTeacher, updateTeacher } from "../../services/teachers";
import { ACADEMIC_LEVELS } from "../../lib/academicLevels";
import type { Teacher, TeacherInput } from "../../types/teacher";

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface TeacherFormModalProps {
  teacher?: Teacher;
  onClose: () => void;
}

export function TeacherFormModal({ teacher, onClose }: TeacherFormModalProps) {
  const qc = useQueryClient();
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: listGrades });

  const [form, setForm] = useState<TeacherInput>({
    first_name: teacher?.first_name ?? "",
    last_name: teacher?.last_name ?? "",
    email: teacher?.email ?? "",
    phone: teacher?.phone ?? "",
    department: teacher?.department ?? "",
    grade: teacher?.grade ?? "",
    specialty: teacher?.specialty ?? "",
    is_active: teacher?.is_active ?? true,
    university_id: teacher?.university_id ?? "",
    matricule: teacher?.matricule ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  // Assignation de matières — uniquement à la création (voir plan validé avec
  // l'utilisateur) : rattache un ou plusieurs cours déjà créés (module Cours)
  // au nouvel enseignant, filtrés par filière(s) → niveau(x) — plusieurs
  // filières et niveaux sélectionnables à la fois. Un cours ne pouvant avoir
  // qu'un seul enseignant (contrainte du modèle), le sélectionner ici le
  // RÉASSIGNE depuis son enseignant actuel, le cas échéant.
  const [assignDepts, setAssignDepts] = useState<string[]>([]);
  const [assignLevels, setAssignLevels] = useState<string[]>([]);
  const [assignCourseIds, setAssignCourseIds] = useState<string[]>([]);
  const { data: allCourses = [] } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => listCourses(),
    enabled: !teacher,
  });
  const assignableCourses = useMemo(
    () => allCourses.filter((c) => assignDepts.includes(c.department) && assignLevels.includes(c.level)),
    [allCourses, assignDepts, assignLevels]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (teacher) return updateTeacher(teacher.id, form);
      const created = await createTeacher(form);
      if (assignCourseIds.length > 0) {
        await Promise.all(assignCourseIds.map((courseId) => updateCourse(courseId, { teacher: created.id })));
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teachers-directory"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["courses-all"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Vérifiez les champs (e-mail/matricule doivent être uniques)."),
  });

  function set<K extends keyof TeacherInput>(key: K, value: TeacherInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title={teacher ? "Modifier l'enseignant" : "Nouvel enseignant"} onClose={onClose}>
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
            <input className="input" required value={form.matricule} onChange={(e) => set("matricule", e.target.value)} />
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
            <label>Département</label>
            <select className="input" required value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Grade</label>
            <select className="input" value={form.grade ?? ""} onChange={(e) => set("grade", e.target.value)}>
              <option value="">—</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Spécialité</label>
          <input className="input" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} />
        </div>
        <label className="radio">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Compte actif
        </label>

        {!teacher && (
          <>
            <div style={{ borderTop: "1px solid var(--color-divider)", margin: "4px 0" }} />
            <div className="field">
              <label>Matières à enseigner (optionnel)</label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Filière(s)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {departments.map((d) => (
                    <label key={d.id} className="radio">
                      <input
                        type="checkbox"
                        checked={assignDepts.includes(d.id)}
                        onChange={() => {
                          setAssignDepts((ids) => toggleInArray(ids, d.id));
                          setAssignCourseIds([]);
                        }}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Niveau(x)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {ACADEMIC_LEVELS.map((l) => (
                    <label key={l.code} className="radio">
                      <input
                        type="checkbox"
                        disabled={assignDepts.length === 0}
                        checked={assignLevels.includes(l.code)}
                        onChange={() => {
                          setAssignLevels((codes) => toggleInArray(codes, l.code));
                          setAssignCourseIds([]);
                        }}
                      />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {assignDepts.length > 0 && assignLevels.length > 0 && (
              <div className="field">
                <label>Matières disponibles pour ces filières et niveaux</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {assignableCourses.map((c) => (
                    <label key={c.id} className="radio">
                      <input
                        type="checkbox"
                        checked={assignCourseIds.includes(c.id)}
                        onChange={(e) =>
                          setAssignCourseIds((ids) =>
                            e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)
                          )
                        }
                      />
                      {c.name} ({c.code}) — {c.department_name}
                      {c.teacher_name ? ` — actuellement : ${c.teacher_name}` : ""}
                    </label>
                  ))}
                  {assignableCourses.length === 0 && (
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Aucune matière pour ces filières et niveaux.
                    </div>
                  )}
                </div>
                {assignCourseIds.length > 0 && (
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Les matières cochées déjà attribuées à un autre enseignant lui seront retirées et réattribuées au
                    nouvel enseignant.
                  </div>
                )}
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
