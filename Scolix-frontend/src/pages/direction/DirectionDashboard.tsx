import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAlerts, getClassification, getHeatmap, getPunctualityCorrelation } from "../../services/analytics";
import { deleteDepartment, listDepartments, listSemesters } from "../../services/sync";
import { fmtNumber } from "../../lib/format";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { DepartmentFormModal } from "../admin/CoursDepartments";
import { Modal } from "../../components/ui/Modal";
import { EditButton } from "../../components/ui/EditButton";
import { DeleteButton } from "../../components/ui/DeleteButton";
import type { Department } from "../../types/sync";
import type { ClassificationCategory } from "../../types/analytics";

const SEVERITY = {
  crit: { tag: "tag-crit", label: "Critique" },
  surv: { tag: "tag-surv", label: "À surveiller" },
  info: { tag: "tag-info", label: "Information" },
} as const;

function severityFor(deviationPct: number): keyof typeof SEVERITY {
  const abs = Math.abs(deviationPct);
  if (abs >= 20) return "crit";
  if (abs >= 10) return "surv";
  return "info";
}

function ramp(score: number): string {
  const stops = ["#eef6ff", "#d6ebff", "#b5d9fd", "#94bce3", "#749dc4", "#597ea3", "#416180", "#2c455d"];
  const step = Math.min(7, Math.max(0, Math.round(((score - 40) / 60) * 7)));
  return stops[step];
}

const PROFILE_LABEL: Record<ClassificationCategory, string> = {
  EXCEPTIONAL: "Exceptionnel — score > 80 %",
  PROGRESSING: "En progression — 60 à 80 %",
  NEEDS_SUPPORT: "À accompagner — < 60 %",
};

export function DirectionDashboard() {
  const navigate = useNavigate();

  const qc = useQueryClient();
  // undefined = fermé, null = création, Department = modification.
  const [editingDept, setEditingDept] = useState<Department | null | undefined>(undefined);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);

  usePageCreateAction("Nouveau département", () => setEditingDept(null));

  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const removeDept = useMutation({
    mutationFn: (d: Department) => deleteDepartment(d.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setDeletingDept(null);
    },
  });

  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts", "all"], queryFn: () => getAlerts() });
  const { data: classification = [] } = useQuery({ queryKey: ["classification", "all"], queryFn: () => getClassification() });
  const { data: correlation } = useQuery({
    queryKey: ["punctuality-correlation", "all"],
    queryFn: () => getPunctualityCorrelation(),
  });

  const orderedSemesters = [...semesters].sort((a, b) => a.start_date.localeCompare(b.start_date));

  const { data: heatCells = [] } = useQuery({
    queryKey: ["heatmap-by-semester", orderedSemesters.map((s) => s.id)],
    queryFn: () => Promise.all(orderedSemesters.map((s) => getHeatmap(s.id))),
    enabled: orderedSemesters.length > 0,
  });

  // Une ligne par département actif (les départements supprimés — désactivés —
  // disparaissent), y compris ceux qui n'ont encore aucun score (« — »).
  const heatRows = departments.map((d) => ({
    dept: d,
    cells: orderedSemesters.map((_, i) => heatCells[i]?.find((c) => c.department_id === d.id)?.avg_score ?? null),
  }));

  const profileCounts: Record<ClassificationCategory, number> = { EXCEPTIONAL: 0, PROGRESSING: 0, NEEDS_SUPPORT: 0 };
  classification.forEach((c) => {
    profileCounts[c.category] += 1;
  });
  const totalProfiles = classification.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 20 }}>
        {alerts.length === 0 && (
          <div className="card" style={{ padding: "20px 22px" }}>
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucune alerte statistique significative détectée pour le moment.
            </div>
          </div>
        )}
        {alerts.map((a) => {
          const sev = severityFor(a.deviation_pct);
          return (
            <div key={a.teacher_id} className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`tag ${SEVERITY[sev].tag}`}>{SEVERITY[sev].label}</span>
              </div>
              <div className="card-title">Écart de score détecté — {a.teacher_name}</div>
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                Score actuel {fmtNumber(a.current_avg, 1)} vs historique {fmtNumber(a.historical_avg, 1)} ({a.deviation_pct > 0 ? "+" : ""}
                {fmtNumber(a.deviation_pct, 1)} %).
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" disabled title="Aucune action de traitement exposée par le backend">
                  Traiter
                </button>
                <button type="button" className="btn btn-ghost" disabled title="Aucune action d'ignorance exposée par le backend">
                  Ignorer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>Performance par département et semestre</h4>
          <span className="text-muted" style={{ fontSize: 12 }}>
            Score global pondéré, sur 100
          </span>
        </div>
        {heatRows.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Aucun département enregistré.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `160px repeat(${orderedSemesters.length}, 1fr) auto`,
                gap: 6,
                alignItems: "center",
              }}
            >
              <div></div>
              {orderedSemesters.map((s) => (
                <div key={s.id} className="text-muted" style={{ fontSize: 11, textAlign: "center" }}>
                  {s.name.replace("Semestre ", "S")}
                </div>
              ))}
              <div></div>
              {heatRows.map((row) => (
                <div key={row.dept.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 13 }}>{row.dept.name}</div>
                  {row.cells.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        height: 42,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        background: v === null ? "var(--color-neutral-200)" : ramp(v),
                        color: v !== null && v > 70 ? "#f2f2f3" : "#1d1f20",
                      }}
                    >
                      {v === null ? "—" : fmtNumber(v, 1)}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 2 }}>
                    <EditButton onClick={() => setEditingDept(row.dept)} />
                    <DeleteButton onClick={() => setDeletingDept(row.dept)} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span className="text-muted" style={{ fontSize: 11 }}>
                40
              </span>
              <div style={{ flex: 1, height: 6, background: "linear-gradient(90deg, var(--color-accent-100), var(--color-accent-800))" }} />
              <span className="text-muted" style={{ fontSize: 11 }}>
                100
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Répartition des profils</h4>
          {totalProfiles === 0 ? (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucune classification calculée pour le moment.
            </div>
          ) : (
            (Object.keys(PROFILE_LABEL) as ClassificationCategory[]).map((cat) => {
              const count = profileCounts[cat];
              const pct = (count / totalProfiles) * 100;
              return (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", fontSize: 13 }}>
                    <span style={{ marginRight: "auto" }}>{PROFILE_LABEL[cat]}</span>
                    <span className="text-muted">{count} enseignants</span>
                  </div>
                  <div style={{ height: 6, background: "var(--color-neutral-200)" }}>
                    <div style={{ height: 6, background: "var(--color-accent)", width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Corrélation ponctualité / satisfaction</h4>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            {correlation
              ? correlation.description
              : "Calcul en cours…"}
          </p>
          {correlation?.coefficient !== null && correlation?.coefficient !== undefined ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1 }}>
                r = {fmtNumber(correlation.coefficient, 2)}
              </span>
              <span className="tag tag-accent">{correlation.label}</span>
            </div>
          ) : (
            correlation && (
              <div className="text-muted" style={{ fontSize: 13 }}>
                {correlation.label}
              </div>
            )
          )}
          <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/ia-clusters")}>
            Voir l'analyse détaillée
          </button>
        </div>
      </div>
      {editingDept !== undefined && (
        <DepartmentFormModal department={editingDept ?? undefined} onClose={() => setEditingDept(undefined)} />
      )}
      {deletingDept && (
        <Modal title="Supprimer le département" onClose={() => setDeletingDept(null)}>
          <p style={{ fontSize: 13, margin: 0 }}>
            Le département <strong>{deletingDept.name}</strong> ({deletingDept.code}) sera retiré de la liste. Il est
            seulement désactivé : aucune donnée n'est effacée en base.
          </p>
          {removeDept.isError && (
            <div style={{ fontSize: 12, color: "#F43F5E" }}>La suppression a échoué. Réessayez.</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setDeletingDept(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={removeDept.isPending}
              onClick={() => removeDept.mutate(deletingDept)}
            >
              {removeDept.isPending ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
