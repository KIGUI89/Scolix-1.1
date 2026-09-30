import { useQuery } from "@tanstack/react-query";
import { getAlerts } from "../../services/analytics";
import { fmtNumber } from "../../lib/format";
import { usePageChrome } from "../../store/pageChromeStore";

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

export function Alerts() {
  usePageChrome({ hideCreate: true });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts", "all"], queryFn: () => getAlerts() });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
      {alerts.length === 0 && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div className="text-muted" style={{ fontSize: 14 }}>
            Aucune alerte statistique significative détectée pour le moment.
          </div>
        </div>
      )}
      {alerts.map((a) => {
        const sev = severityFor(a.deviation_pct);
        return (
          <div key={a.teacher_id} className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className={`tag ${SEVERITY[sev].tag}`}>{SEVERITY[sev].label}</span>
              <span className="card-title" style={{ marginRight: "auto" }}>
                Écart de score détecté — {a.teacher_name}
              </span>
            </div>
            <p style={{ fontSize: 14, margin: 0 }}>
              Score actuel {fmtNumber(a.current_avg, 1)}/100 vs historique {fmtNumber(a.historical_avg, 1)}/100 (
              {a.deviation_pct > 0 ? "+" : ""}
              {fmtNumber(a.deviation_pct, 1)} %, {a.direction === "up" ? "hausse" : "baisse"}).
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-accent-800)" }}
                disabled
                title="Aucune action de traitement exposée par le backend"
              >
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
  );
}
