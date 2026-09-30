import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentTasks } from "../../hooks/useStudentTasks";
import { SubmissionDetailModal } from "../../components/evaluations/SubmissionDetailModal";

type Filter = "TODO" | "DONE" | "ALL";

export function StudentTodo() {
  const navigate = useNavigate();
  const { tasks, submissions, isLoading } = useStudentTasks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("TODO");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = viewingId ? submissions.find((s) => s.id === viewingId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === "TODO" && t.state === "Terminée") return false;
      if (filter === "DONE" && t.state !== "Terminée") return false;
      if (q && !t.course_name.toLowerCase().includes(q) && !t.teacher_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, filter]);

  if (isLoading) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ maxWidth: 380 }}
          placeholder="Rechercher un cours ou un enseignant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg">
          {([
            ["TODO", "À faire"],
            ["DONE", "Terminées"],
            ["ALL", "Toutes"],
          ] as [Filter, string][]).map(([value, label]) => (
            <label key={value} className={`seg-opt ${filter === value ? "active" : ""}`}>
              <input type="radio" name="stufilter" checked={filter === value} onChange={() => setFilter(value)} style={{ display: "none" }} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Cours</th>
              <th>Code</th>
              <th>Enseignant</th>
              <th>Échéance</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.task_id}>
                <td style={{ fontSize: 13 }}>{t.course_name}</td>
                <td className="text-muted">{t.course_code}</td>
                <td>
                  {t.teacher_name}
                  {t.is_secondary_teacher && <span className="tag tag-info" style={{ marginLeft: 6, fontSize: 10 }}>secondaire</span>}
                </td>
                <td className="text-muted">{t.dueText}</td>
                <td>
                  <span className={`tag ${t.tag}`}>{t.state}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {t.state === "Terminée" ? (
                    <button type="button" className="btn btn-secondary" disabled={!t.submissionId} onClick={() => t.submissionId && setViewingId(t.submissionId)}>
                      {t.cta}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate(`/evaluer?course=${t.course_id}&teacher=${t.teacher_id}`)}
                    >
                      {t.cta}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun cours ne correspond à ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {viewing && <SubmissionDetailModal submission={viewing} onClose={() => setViewingId(null)} />}
    </div>
  );
}
