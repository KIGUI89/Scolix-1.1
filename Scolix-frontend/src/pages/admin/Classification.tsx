import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getClassification } from "../../services/analytics";
import { listDepartments, listSemesters } from "../../services/sync";
import { fmtNumber } from "../../lib/format";
import { useAffichageContent } from "../../store/affichageContentStore";
import { usePageChrome } from "../../store/pageChromeStore";
import type { ClassificationCategory } from "../../types/analytics";

const CAT_LABEL: Record<ClassificationCategory, string> = {
  EXCEPTIONAL: "Exceptionnel",
  PROGRESSING: "En progression",
  NEEDS_SUPPORT: "À accompagner",
};
const CAT_TAG: Record<ClassificationCategory, string> = {
  EXCEPTIONAL: "tag-exc",
  PROGRESSING: "tag-prog",
  NEEDS_SUPPORT: "tag-watch",
};

export function Classification() {
  const navigate = useNavigate();
  const [semesterId, setSemesterId] = useState("");
  const [deptId, setDeptId] = useState("");

  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: rows = [] } = useQuery({
    queryKey: ["classification", semesterId, deptId],
    queryFn: () => getClassification({ semester_id: semesterId || undefined, department_id: deptId || undefined }),
  });

  const counts: Record<ClassificationCategory, number> = { EXCEPTIONAL: 0, PROGRESSING: 0, NEEDS_SUPPORT: 0 };
  rows.forEach((r) => {
    counts[r.category] += 1;
  });

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => navigate("/criteres")}>
          Seuils
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 20 }}>
        {(Object.keys(CAT_LABEL) as ClassificationCategory[]).map((cat) => (
          <div key={cat} className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, background: "var(--color-tile)", borderColor: "var(--color-accent-300)" }}>
            <div style={{ fontSize: 12, color: "var(--color-neutral-900)" }}>{CAT_LABEL[cat]}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 34, lineHeight: 1, color: "var(--color-neutral-900)" }}>{counts[cat]}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Enseignant</th>
              <th>Département</th>
              <th>Score moyen</th>
              <th>Catégorie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teacher_id}>
                <td style={{ fontWeight: 600 }}>{r.teacher_name}</td>
                <td className="text-muted">{r.department_name}</td>
                <td style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(r.avg_score, 1)}</td>
                <td>
                  <span className={`tag ${CAT_TAG[r.category]}`}>{CAT_LABEL[r.category]}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
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
