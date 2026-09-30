import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAlerts, getHeatmap, getKpis, getRanking, getTrends } from "../../services/analytics";
import { listDepartments } from "../../services/sync";
import { downloadRankingCsv } from "../../services/reports";
import { KpiCard } from "../../components/ui/KpiCard";
import { TrendLineChart } from "../../components/charts/TrendLineChart";
import { fmtNumber, fmtPercent } from "../../lib/format";
import { usePageChrome } from "../../store/pageChromeStore";
import { useDashboardFilterStore } from "../../store/dashboardFilterStore";

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

export function AdminDashboard() {
  const navigate = useNavigate();
  const [deptFilter, setDeptFilter] = useState("");
  const semesterId = useDashboardFilterStore((s) => s.semesterId);

  // Le Dashboard est un espace de consultation : pas de bouton "+" ici.
  usePageChrome({ compact: true, hideCreate: true });

  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: kpiData } = useQuery({
    queryKey: ["kpis", "overall", semesterId],
    queryFn: () => getKpis({ semester_id: semesterId || undefined }),
  });
  const { data: trends = [] } = useQuery({ queryKey: ["trends"], queryFn: getTrends });
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", "all", semesterId],
    queryFn: () => getAlerts(semesterId || undefined),
  });
  const { data: ranking = [] } = useQuery({
    queryKey: ["ranking", deptFilter, semesterId],
    queryFn: () => getRanking({ department_id: deptFilter || undefined, semester_id: semesterId || undefined, top_n: 10 }),
  });
  const { data: responseRates = [] } = useQuery({
    queryKey: ["dept-response-rates", departments.map((d) => d.id), semesterId],
    queryFn: async () =>
      Promise.all(
        departments.map(async (d) => {
          const r = await getKpis({ department_id: d.id, semester_id: semesterId || undefined });
          return { name: d.name, pct: r.kpis.participation_rate };
        }),
      ),
    enabled: departments.length > 0,
  });
  const { data: departmentAverages = [] } = useQuery({
    queryKey: ["heatmap", semesterId],
    queryFn: () => getHeatmap(semesterId || undefined),
    enabled: !!semesterId,
  });

  const kpis = kpiData?.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 20 }}>
        <KpiCard
          label="Score global moyen"
          value={kpis ? `${fmtNumber(kpis.avg_global_score, 1)}` : "—"}
          note={kpis ? `sur 100 · ${kpis.total_submissions} soumissions` : undefined}
        />
        <KpiCard
          label="Taux de réponse"
          value={kpis ? fmtPercent(kpis.participation_rate, 1) : "—"}
          note={kpis ? `${kpis.students_completed} étudiants sur ${kpis.students_completed + kpis.students_pending}` : undefined}
        />
        <KpiCard
          label="Enseignants suivis"
          value={kpis ? String(kpis.teachers_evaluated) : "—"}
          note={kpis ? `sur ${kpis.total_teachers} enseignants au total` : undefined}
        />
        <KpiCard
          label="Alertes ouvertes"
          value={String(alerts.length)}
          note={alerts.length > 0 ? "Écarts significatifs détectés" : "Aucun écart significatif détecté"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Classement des enseignants</h4>
            <select className="input" style={{ width: "auto", minHeight: 32 }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Tous les départements</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={() => downloadRankingCsv()}>
              Exporter
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Département</th>
                <th>Score global</th>
                <th>Évaluations</th>
                <th>Profil</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.teacher_id}>
                  <td>{r.teacher_name}</td>
                  <td className="text-muted">{r.department}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, minWidth: 42 }}>
                        {fmtNumber(r.avg_score, 1)}
                      </span>
                      <span style={{ display: "block", width: 96, height: 5, background: "var(--color-neutral-200)" }}>
                        <span style={{ display: "block", height: 5, background: "var(--color-accent)", width: `${r.avg_score}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">{r.eval_count}</td>
                  <td>
                    {r.category && <span className={`tag ${PROFILE_TAG[r.category]}`}>{PROFILE_LABEL[r.category]}</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(`/enseignants/${r.teacher_id}`)}>
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                    Aucune évaluation enregistrée pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
            <h4 style={{ margin: 0 }}>Taux de réponse par département</h4>
            {responseRates.map((d) => (
              <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", fontSize: 13 }}>
                  <span style={{ marginRight: "auto" }}>{d.name}</span>
                  <span className="text-muted">{fmtPercent(d.pct, 1)}</span>
                </div>
                <div style={{ height: 6, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 6, background: "var(--color-accent)", width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
            <h4 style={{ margin: 0 }}>Moyenne par département</h4>
            {departmentAverages.map((d) => (
              <div key={d.department_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", fontSize: 13 }}>
                  <span style={{ marginRight: "auto" }}>{d.department_name}</span>
                  <span className="text-muted">{fmtNumber(d.avg_score, 1)}</span>
                </div>
                <div style={{ height: 6, background: "var(--color-neutral-200)" }}>
                  <div style={{ height: 6, background: "var(--color-accent)", width: `${d.avg_score}%` }} />
                </div>
              </div>
            ))}
            {departmentAverages.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Aucune évaluation enregistrée pour ce semestre.
              </div>
            )}
          </div>
          <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
            <h4 style={{ margin: 0 }}>Score moyen par semestre</h4>
            <TrendLineChart points={trends.map((t) => ({ label: t.semester_name.replace("Semestre ", "S"), value: t.avg_score }))} />
          </div>
        </div>
      </div>
    </div>
  );
}
