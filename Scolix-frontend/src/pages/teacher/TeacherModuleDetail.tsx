import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeacherCourseDetail } from "../../services/teachers";
import { fmtNumber } from "../../lib/format";
import { moduleState } from "../../lib/teacherModuleState";
import { useBreadcrumb } from "../../store/breadcrumbStore";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Détail des résultats d'un module évalué : scores par critère et commentaires anonymes. */
export function TeacherModuleDetail() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();

  const { data: detail, isError, isLoading } = useQuery({
    queryKey: ["teacher-course-detail", courseId],
    queryFn: () => getTeacherCourseDetail(courseId),
    enabled: !!courseId,
    retry: false,
  });

  useBreadcrumb([
    { label: "Modules évalués", onClick: () => navigate("/modules-evalues") },
    { label: detail ? `${detail.course_code} — ${detail.course_name}` : "Détail" },
  ]);

  if (isLoading) return null;
  if (isError || !detail) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="text-muted">Aucune évaluation reçue pour ce module.</div>
      </div>
    );
  }

  const average = detail.average_score == null ? null : Number(detail.average_score);
  const state = moduleState(average ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ padding: "24px 26px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <div className="card-kicker" style={{ marginBottom: 4 }}>
            {detail.course_code} · {detail.semester_name}
          </div>
          <h4 style={{ margin: 0 }}>{detail.course_name}</h4>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            Score global
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 28 }}>{fmtNumber(average, 1)}/100</div>
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 11 }}>
            Réponses
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 28 }}>{detail.total_evaluations}</div>
        </div>
        {average !== null && <span className={`tag ${state.tag}`}>{state.label}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 22 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Scores par critère</h4>
          {detail.criteria_averages.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucun score par critère.
            </div>
          ) : (
            detail.criteria_averages.map((c) => (
              <div key={c.criteria_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", fontSize: 13 }}>
                  <span style={{ marginRight: "auto" }}>{c.criteria_name}</span>
                  <span>{fmtNumber(c.average_score, 1)}/10</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 6, borderRadius: 999, width: `${c.average_score * 10}%`, background: "var(--color-accent)" }} />
                </div>
              </div>
            ))
          )}
        </div>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Commentaires des étudiants</h4>
          {detail.comments.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucun commentaire laissé sur ce module.
            </div>
          ) : (
            detail.comments.map((c, i) => (
              <div key={i} style={{ borderTop: i ? "1px solid var(--color-divider)" : "none", paddingTop: i ? 12 : 0 }}>
                <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                  {c.criteria_name} · {c.score}/10 · {fmtDate(c.created_at)}
                </div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.comment}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
