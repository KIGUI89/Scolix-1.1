import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getKpis, getRanking } from "../../services/analytics";
import { listDepartments, listSemesters } from "../../services/sync";
import { downloadRankingCsv, downloadRankingExcel } from "../../services/reports";
import { fmtNumber } from "../../lib/format";
import { useAffichageContent } from "../../store/affichageContentStore";
import { usePageChrome } from "../../store/pageChromeStore";

export function AdvancedAnalytics() {
  const navigate = useNavigate();
  const [semesterId, setSemesterId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [excelError, setExcelError] = useState<string | null>(null);

  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: kpiData } = useQuery({
    queryKey: ["kpis", semesterId, deptId],
    queryFn: () => getKpis({ semester_id: semesterId || undefined, department_id: deptId || undefined }),
  });
  const { data: ranking = [] } = useQuery({
    queryKey: ["ranking", "full", semesterId, deptId],
    queryFn: () => getRanking({ semester_id: semesterId || undefined, department_id: deptId || undefined, top_n: 200 }),
  });

  const kpis = kpiData?.kpis;
  const tiles = kpis
    ? [
        { label: "Total soumissions", value: String(kpis.total_submissions) },
        { label: "Enseignants évalués", value: String(kpis.teachers_evaluated) },
        { label: "Score moyen global", value: fmtNumber(kpis.avg_global_score, 1), unit: "/100" },
        { label: "Taux de participation", value: fmtNumber(kpis.participation_rate, 1), unit: "%" },
        { label: "Étudiants ayant évalué", value: String(kpis.students_completed) },
        { label: "Étudiants n'ayant pas évalué", value: String(kpis.students_pending) },
        { label: "NPS", value: fmtNumber(kpis.nps, 0) },
        { label: "Taux de satisfaction", value: fmtNumber(kpis.satisfaction_rate, 1), unit: "%" },
      ]
    : [];

  async function handleExcel() {
    setExcelError(null);
    try {
      await downloadRankingExcel(semesterId || undefined);
    } catch {
      setExcelError("Export Excel indisponible actuellement (dépendance manquante côté serveur).");
    }
  }

  usePageChrome({ hideCreate: true });
  useAffichageContent(() => (
    <>
      <div className="field">
        <label>Semestre</label>
        <select className="input" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">Tous les semestres</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Département</label>
        <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
          <option value="">Tous les départements</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </>
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => downloadRankingCsv(semesterId || undefined)}>
          Export CSV
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleExcel}>
          Export Excel
        </button>
      </div>
      {excelError && <div style={{ fontSize: 12, color: "#F43F5E" }}>{excelError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 18 }}>
        {tiles.map((k) => (
          <div key={k.label} className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8, background: "var(--color-tile)", boxShadow: "var(--shadow-tile)" }}>
            <div style={{ fontSize: 12, color: "var(--color-neutral-900)" }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, lineHeight: 1, color: "var(--color-neutral-900)" }}>{k.value}</span>
              {k.unit && <span style={{ fontSize: 13, color: "var(--color-neutral-900)" }}>{k.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>Classement complet — {ranking.length} enseignant(s)</h4>
          <span className="tag tag-method">Score global pondéré</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Enseignant</th>
              <th>Département</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r) => (
              <tr key={r.teacher_id}>
                <td>
                  <span className="tag tag-rank">{r.rank}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{r.teacher_name}</td>
                <td className="text-muted">{r.department}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ display: "block", width: 110, height: 6, background: "var(--color-neutral-200)", borderRadius: 999 }}>
                      <span style={{ display: "block", height: 6, borderRadius: 999, background: "var(--color-accent)", width: `${r.avg_score}%` }} />
                    </span>
                    <span style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(r.avg_score, 1)}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => navigate(`/enseignants/${r.teacher_id}`)}>
                    Voir l'analyse
                  </button>
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucune donnée pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
