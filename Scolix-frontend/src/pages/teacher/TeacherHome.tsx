import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useAuthStore } from "../../store/authStore";
import { getTeacherDashboard, getTeacherScores } from "../../services/teachers";
import { fmtNumber } from "../../lib/format";
import { moduleState } from "../../lib/teacherModuleState";
import { usePageTitle } from "../../hooks/usePageTitle";

export function TeacherHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.teacher_profile_id;

  const { data: dashboard } = useQuery({ queryKey: ["teacher-dashboard"], queryFn: getTeacherDashboard });
  usePageTitle(dashboard ? `${dashboard.teacher_name} — tableau de bord` : null);
  const { data: scores } = useQuery({
    queryKey: ["teacher-scores-self", teacherId],
    queryFn: () => getTeacherScores(teacherId!),
    enabled: !!teacherId,
  });

  if (!dashboard) return null;

  const responseRate = dashboard.total_enrolled > 0 ? Math.min(100, Math.round((dashboard.total_evaluations / dashboard.total_enrolled) * 100)) : null;

  const kpis = [
    { label: "Score global", value: fmtNumber(Number(dashboard.global_average), 1), unit: "/100", note: "classement département indisponible pour ce rôle" },
    { label: "Fiches reçues", value: String(dashboard.total_evaluations), unit: "", note: dashboard.total_enrolled > 0 ? `sur ${dashboard.total_enrolled} étudiant(s) inscrit(s)` : "ce semestre" },
    { label: "Taux de réponse", value: responseRate !== null ? String(responseRate) : "—", unit: responseRate !== null ? " %" : "", note: "ce semestre" },
    { label: "Modules évalués", value: String(dashboard.evaluated_courses.length), unit: "", note: "avec au moins une évaluation reçue" },
  ];

  const semesterHistory = (scores?.semester_history ?? []).slice(-5);
  const maxHistory = Math.max(1, ...semesterHistory.map((s) => s.avg_score));

  const modulesPreview = dashboard.evaluated_courses.slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6, background: "var(--color-tile)", boxShadow: "var(--shadow-tile)", minWidth: 0 }}>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {k.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{k.value}</span>
              <span className="text-muted" style={{ fontSize: 13 }}>
                {k.unit}
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 12, alignItems: "start" }}>
        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="card-title" style={{ marginRight: "auto" }}>
              Profil sur les six critères
            </span>
            <span className="text-muted" style={{ fontSize: 12 }}>
              vous
            </span>
          </div>
          {!scores || scores.criteria_scores.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 12, padding: "48px 0", textAlign: "center" }}>
              Aucune évaluation enregistrée ce semestre.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={scores.criteria_scores.map((c) => ({ criterion: c.criteria_name, score: c.avg_score }))} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="var(--color-divider)" />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "var(--color-text)" }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.14} strokeWidth={1.8} dot={{ fill: "var(--color-accent)", r: 3, strokeWidth: 0 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="card-title">Score global sur cinq semestres</span>
            {semesterHistory.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Pas encore assez d'historique.
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140 }}>
                {semesterHistory.map((s) => (
                  <div key={s.semester_id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12 }}>{fmtNumber(s.avg_score, 1)}</span>
                    <div style={{ width: "100%", height: `${Math.max(8, (s.avg_score / maxHistory) * 100)}%`, background: "color-mix(in srgb, var(--color-accent) 22%, transparent)", borderTop: "2px solid var(--color-accent)" }} />
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      {s.semester_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, background: "var(--color-tile)", boxShadow: "var(--shadow-tile)" }}>
            <span className="card-title">Détail par critère</span>
            {(scores?.criteria_scores ?? []).map((c) => (
              <div key={c.criteria_id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
                  <span style={{ marginRight: "auto" }}>{c.criteria_name}</span>
                  <span>{fmtNumber(c.avg_score, 1)}/10</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 6, borderRadius: 999, width: `${(c.avg_score / 10) * 100}%`, background: "var(--color-accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="card-title" style={{ marginRight: "auto" }}>
            Modules évalués ce semestre
          </span>
          <a href="/modules-evalues" onClick={(e) => { e.preventDefault(); navigate("/modules-evalues"); }} style={{ fontSize: 12, color: "var(--color-accent-700)" }}>
            Tout voir
          </a>
        </div>
        {modulesPreview.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13, padding: "10px 0" }}>
            Aucun module évalué pour le moment.
          </div>
        )}
        {modulesPreview.map((m) => {
          const rate = m.enrolled_count > 0 ? Math.min(100, Math.round((m.total_evaluations / m.enrolled_count) * 100)) : null;
          const state = moduleState(m.average_score);
          return (
            <div key={m.course__id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: "1px solid var(--color-divider)", flexWrap: "wrap" }}>
              <div style={{ minWidth: 160, marginRight: "auto" }}>
                <div style={{ fontSize: 13 }}>{m.course__name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {m.course__code}
                </div>
              </div>
              <div style={{ width: 140, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 6, borderRadius: 999, width: `${rate ?? 0}%`, background: "var(--color-accent)" }} />
                </div>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {rate !== null ? `${rate} %` : "—"}
                </span>
              </div>
              <span style={{ fontSize: 13, width: 56 }}>{fmtNumber(m.average_score, 1)}/100</span>
              <span className={`tag ${state.tag}`}>{state.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
