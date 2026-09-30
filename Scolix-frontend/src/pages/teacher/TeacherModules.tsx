import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeacherDashboard } from "../../services/teachers";
import { fmtNumber } from "../../lib/format";
import { moduleState } from "../../lib/teacherModuleState";

export function TeacherModules() {
  const navigate = useNavigate();
  const { data: dashboard } = useQuery({ queryKey: ["teacher-dashboard"], queryFn: getTeacherDashboard });

  if (!dashboard) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Module</th>
              <th>Niveau</th>
              <th>Réponses</th>
              <th>Taux</th>
              <th>Score</th>
              <th>Évolution</th>
              <th>Lecture</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dashboard.evaluated_courses.map((m) => {
              const rate = m.enrolled_count > 0 ? Math.min(100, Math.round((m.total_evaluations / m.enrolled_count) * 100)) : null;
              const state = moduleState(m.average_score);
              return (
                <tr key={m.course__id}>
                  <td>{m.course__code}</td>
                  <td style={{ fontSize: 13 }}>{m.course__name}</td>
                  <td className="text-muted">—</td>
                  <td>{m.enrolled_count > 0 ? `${m.total_evaluations} / ${m.enrolled_count}` : m.total_evaluations}</td>
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--color-neutral-200)" }}>
                        <div style={{ height: 6, borderRadius: 999, width: `${rate ?? 0}%`, background: "var(--color-accent)" }} />
                      </div>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {rate !== null ? `${rate} %` : "—"}
                      </span>
                    </div>
                  </td>
                  <td>{fmtNumber(m.average_score, 1)}/100</td>
                  <td className="text-muted">{m.score_delta !== null ? (m.score_delta > 0 ? `+${fmtNumber(m.score_delta, 1)}` : fmtNumber(m.score_delta, 1)) : "—"}</td>
                  <td>
                    <span className={`tag ${state.tag}`}>{state.label}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(`/modules-evalues/${m.course__id}`)}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              );
            })}
            {dashboard.evaluated_courses.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun module évalué pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
