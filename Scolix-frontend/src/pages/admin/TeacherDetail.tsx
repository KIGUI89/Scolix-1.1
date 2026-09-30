import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  RadarChart as RTRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getTeacher, getTeacherComments, getTeacherScores } from "../../services/teachers";
import { getClustering, getTeacherBias, getTeacherRecommendations } from "../../services/aiEngine";
import { getRanking } from "../../services/analytics";
import { downloadTeacherPdf } from "../../services/reports";
import { fmtNumber } from "../../lib/format";
import { useBreadcrumb } from "../../store/breadcrumbStore";

function TooltipCard({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-panel)",
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--color-accent)", flex: "none" }} />
        <span>Score : {fmtNumber(value, 1)}</span>
      </div>
    </div>
  );
}

function CriteriaTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { criterion: string }; value: number }> }) {
  if (!active || !payload?.length) return null;
  return <TooltipCard title={payload[0].payload.criterion} value={payload[0].value} />;
}

function SemesterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { semester: string }; value: number }> }) {
  if (!active || !payload?.length) return null;
  return <TooltipCard title={payload[0].payload.semester} value={payload[0].value} />;
}

const PROFILE_TAG: Record<string, string> = {
  EXCEPTIONAL: "tag-exc",
  PROGRESSING: "tag-prog",
  NEEDS_SUPPORT: "tag-watch",
};
const PROFILE_LABEL: Record<string, string> = {
  EXCEPTIONAL: "Exceptionnel",
  PROGRESSING: "En progression",
  NEEDS_SUPPORT: "À accompagner",
};

export function TeacherDetail() {
  const { teacherId = "" } = useParams();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: teacher } = useQuery({ queryKey: ["teacher", teacherId], queryFn: () => getTeacher(teacherId), enabled: !!teacherId });
  const navigate = useNavigate();
  useBreadcrumb([{ label: "Enseignants", onClick: () => navigate("/enseignants") }, { label: teacher?.full_name ?? "Fiche enseignant" }]);
  const { data: scores } = useQuery({ queryKey: ["teacher-scores", teacherId], queryFn: () => getTeacherScores(teacherId), enabled: !!teacherId });
  const { data: comments } = useQuery({
    queryKey: ["teacher-comments", teacherId],
    queryFn: () => getTeacherComments(teacherId),
    enabled: !!teacherId,
  });
  const { data: recos } = useQuery({
    queryKey: ["teacher-recos", teacherId],
    queryFn: () => getTeacherRecommendations(teacherId),
    enabled: !!teacherId,
  });
  const { data: deptRanking } = useQuery({
    queryKey: ["ranking", "dept", teacher?.department],
    queryFn: () => getRanking({ department_id: teacher!.department, top_n: 200 }),
    enabled: !!teacher?.department,
  });
  // Toutes périodes confondues (comme Analytics/Classification/IA & Clusters/Biais
  // détectés par défaut, sans filtre semestre) — pour rester cohérent avec ces écrans.
  const { data: clustering } = useQuery({ queryKey: ["clustering"], queryFn: getClustering });
  const { data: teacherBias = [] } = useQuery({
    queryKey: ["bias", "teacher", teacherId],
    queryFn: () => getTeacherBias(teacherId),
    enabled: !!teacherId,
  });

  const cluster = clustering?.clusters.find((c) => c.teachers.some((t) => t.teacher_id === teacherId));

  const percentile = (() => {
    if (!deptRanking || deptRanking.length === 0) return null;
    const idx = deptRanking.findIndex((r) => r.teacher_id === teacherId);
    if (idx === -1) return null;
    return Math.round((1 - idx / deptRanking.length) * 100);
  })();

  async function handlePdf() {
    if (!teacher) return;
    setPdfError(null);
    setPdfLoading(true);
    try {
      await downloadTeacherPdf(teacher.id, teacher.full_name);
    } catch {
      setPdfError("Génération PDF indisponible actuellement (dépendance manquante côté serveur).");
    } finally {
      setPdfLoading(false);
    }
  }

  if (!teacher) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                border: "1px solid var(--color-divider)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-heading)",
                fontSize: 20,
              }}
            >
              {teacher.first_name[0]}
              {teacher.last_name[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 style={{ margin: 0 }}>{teacher.full_name}</h4>
                {scores?.category && (
                  <span className={`tag ${PROFILE_TAG[scores.category]}`}>{PROFILE_LABEL[scores.category]}</span>
                )}
              </div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {teacher.department_name} — {teacher.specialty}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
              gap: 1,
              background: "var(--color-accent-300)",
              border: "1px solid var(--color-accent-300)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <div style={{ background: "var(--color-tile)", padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--color-accent-900)" }}>
                {scores?.global_average != null ? fmtNumber(scores.global_average, 1) : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-accent-700)" }}>Score global /100</div>
            </div>
            <div style={{ background: "var(--color-tile)", padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--color-accent-900)" }}>
                {percentile != null ? `${percentile}ᵉ` : "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-accent-700)" }}>Percentile dépt.</div>
            </div>
            <div style={{ background: "var(--color-tile)", padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--color-accent-900)" }}>
                {scores?.total_evaluations ?? "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-accent-700)" }}>Évaluations</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Comparaison triple
            </div>
            {scores?.global_average != null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", fontSize: 13 }}>
                  <span style={{ marginRight: "auto" }}>Notes étudiants</span>
                  <span>{fmtNumber(scores.global_average, 1)}</span>
                </div>
                <div style={{ height: 8, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 8, background: "#2c455d", width: `${scores.global_average}%` }} />
                </div>
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Aucune note étudiante disponible pour cet enseignant.
              </div>
            )}
            {["Auto-évaluation", "Audit interne"].map((label) => (
              <div key={label} className="text-muted" style={{ fontSize: 12 }}>
                {label} — source non disponible dans le backend actuel.
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={handlePdf} disabled={pdfLoading}>
                {pdfLoading ? "Génération…" : "Export PDF"}
              </button>
              <button type="button" className="btn btn-secondary" disabled title="Aucun historique exposé par le backend">
                Historique
              </button>
            </div>
            {pdfError && <span style={{ fontSize: 12, color: "#F43F5E" }}>{pdfError}</span>}
          </div>
        </div>

        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column" }}>
          <h4 style={{ margin: 0 }}>Score moyen par critère</h4>
          <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 12px" }}>
            Radar global sur 10
          </p>
          {!scores || scores.criteria_scores.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 12, padding: "48px 0", textAlign: "center" }}>
              Aucune évaluation enregistrée pour cet enseignant.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RTRadarChart
                data={scores.criteria_scores.map((c) => ({ criterion: c.criteria_name, score: c.avg_score }))}
                margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
              >
                <PolarGrid stroke="var(--color-divider)" />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "var(--color-text)" }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="var(--color-accent)"
                  fill="var(--color-accent)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={{ fill: "var(--color-accent)", r: 3, strokeWidth: 0 }}
                />
                <Tooltip content={<CriteriaTooltip />} />
              </RTRadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column" }}>
          <h4 style={{ margin: 0 }}>Évolution des scores</h4>
          <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 12px" }}>
            Par semestre (historique complet)
          </p>
          {!scores || scores.semester_history.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 12, padding: "48px 0", textAlign: "center" }}>
              Aucun historique de scores pour cet enseignant.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={scores.semester_history.map((s) => ({ semester: s.semester_name, score: s.avg_score }))}
                margin={{ top: 10, right: 16, bottom: 0, left: -20 }}
              >
                <CartesianGrid stroke="var(--color-divider)" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 10, fill: "var(--color-text)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: "var(--color-text)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<SemesterTooltip />} cursor={{ stroke: "var(--color-divider)" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-accent)", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-accent-800)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Regroupement — IA & Clusters</h4>
            <span className="tag tag-method">K-Means</span>
          </div>
          {cluster ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className="card-title">{cluster.label}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {cluster.size} enseignant(s) dans ce groupe
                </span>
              </div>
              <div style={{ display: "flex", fontSize: 13 }}>
                <span style={{ marginRight: "auto" }}>Score moyen du groupe</span>
                <span style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(cluster.avg_global_score, 1)}/100</span>
              </div>
            </>
          ) : (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucun clustering calculé pour le moment, ou cet enseignant n'y figure pas encore.
            </div>
          )}
        </div>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Biais détectés</h4>
            <span className="tag tag-zscore">z-score</span>
          </div>
          {teacherBias.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Critère</th>
                  <th>Moyenne</th>
                  <th>z-score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teacherBias.map((b) => (
                  <tr key={b.criteria_id}>
                    <td className="text-muted">{b.criteria_name}</td>
                    <td>{fmtNumber(b.avg_score, 2)}</td>
                    <td style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(b.z_score, 2)}</td>
                    <td>{b.is_outlier && <span className="tag tag-crit">Atypique</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucune donnée de biais pour cet enseignant.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Commentaires étudiants — anonymisés</h4>
            <span className="tag tag-neutral">{comments?.total_comments ?? 0} réponses</span>
          </div>
          {comments && comments.comments.length > 0 ? (
            comments.comments.map((c) => (
              <div
                key={c.comment_id}
                style={{
                  borderLeft: "2px solid var(--color-divider)",
                  padding: "4px 0 4px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <p style={{ margin: 0, fontSize: 14 }}>{c.comment}</p>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {c.criteria_name} · {c.semester_name}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucun commentaire pour le moment.
            </div>
          )}
        </div>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Recommandations de formation</h4>
          {recos && recos.recommendations.length > 0 ? (
            recos.recommendations.map((r) => (
              <div
                key={r.criteria_id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "12px 0",
                  borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="card-title" style={{ marginRight: "auto" }}>
                    {r.criteria_name}
                  </span>
                  <span className="tag tag-accent">{fmtNumber(r.score_pct, 0)} %</span>
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {r.recommendation}
                </div>
                {r.trainings.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                    {r.trainings.map((t) =>
                      t.url ? (
                        <a key={t.id} href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          {t.title} — {t.provider}
                        </a>
                      ) : (
                        <span key={t.id} style={{ fontSize: 12 }}>
                          {t.title} — {t.provider}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucune recommandation générée pour le moment.
            </div>
          )}
          <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} disabled title="Aucune action de proposition exposée par le backend">
            Proposer à l'enseignant
          </button>
        </div>
      </div>
    </div>
  );
}
