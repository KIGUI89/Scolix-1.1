import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createTeacherReport } from "../../services/evaluations";
import { listMyEnrollments } from "../../services/sync";
import { extractErrorMessage } from "../../lib/errors";
import type { MyEnrollmentRow } from "../../types/sync";

interface TeacherReportFormModalProps {
  onClose: () => void;
}

export function TeacherReportFormModal({ onClose }: TeacherReportFormModalProps) {
  const qc = useQueryClient();
  const { data: enrollments = [], isLoading } = useQuery({ queryKey: ["my-enrollments"], queryFn: listMyEnrollments });

  const teachers = dedupeTeachers(enrollments);

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const teacher = teachers.find((t) => t.teacher_id === teacherId) ?? null;

  const mutation = useMutation({
    mutationFn: () => createTeacherReport({ teacher_id: teacherId!, title, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-teacher-reports"] });
      onClose();
    },
    onError: (err) => setError(extractErrorMessage(err, "Impossible d'enregistrer ce rapport. Vérifiez les champs.")),
  });

  return (
    <Modal title={teacher ? `Nouveau rapport — ${teacher.teacher_name}` : "Nouveau rapport"} onClose={onClose}>
      {!teacher ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            Choisissez l'enseignant concerné par ce rapport.
          </p>
          {isLoading ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Chargement…
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucun enseignant trouvé dans vos inscriptions.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {teachers.map((t) => (
                <button
                  key={t.teacher_id}
                  type="button"
                  className="card"
                  style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                  onClick={() => setTeacherId(t.teacher_id)}
                >
                  <span className="card-title">{t.teacher_name}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {t.courses.join(", ")}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <div className="field">
            <label>Titre</label>
            <input className="input" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Contenu</label>
            <textarea
              className="input"
              required
              rows={6}
              style={{ minHeight: 140, padding: "8px 10px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setTeacherId(null)}>
              ← Changer d'enseignant
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn-secondary" disabled={mutation.isPending}>
                {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

interface TeacherOption {
  teacher_id: string;
  teacher_name: string;
  courses: string[];
}

function dedupeTeachers(rows: MyEnrollmentRow[]): TeacherOption[] {
  const byTeacher = new Map<string, TeacherOption>();
  for (const r of rows) {
    let entry = byTeacher.get(r.teacher_id);
    if (!entry) {
      entry = { teacher_id: r.teacher_id, teacher_name: r.teacher_name, courses: [] };
      byTeacher.set(r.teacher_id, entry);
    }
    if (!entry.courses.includes(r.course_name)) entry.courses.push(r.course_name);
  }
  return Array.from(byTeacher.values()).sort((a, b) => a.teacher_name.localeCompare(b.teacher_name));
}
