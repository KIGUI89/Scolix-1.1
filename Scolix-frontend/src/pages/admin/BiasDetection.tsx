import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { computeEvaluatorBias, computeTeacherBias, getEvaluatorBiasConfig, setEvaluatorBiasNormalization } from "../../services/aiEngine";
import { pseudonym } from "../../lib/hash";
import { fmtNumber } from "../../lib/format";
import { usePageChrome } from "../../store/pageChromeStore";

type View = "teachers" | "evaluators";

function severity(zScore: number): { label: string; tag: string } {
  const abs = Math.abs(zScore);
  if (abs >= 2.5) return { label: "Critique", tag: "tag-crit" };
  if (abs >= 2) return { label: "À surveiller", tag: "tag-watch2" };
  return { label: "Normal", tag: "tag-neutral" };
}

export function BiasDetection() {
  usePageChrome({ hideCreate: true });
  const qc = useQueryClient();
  const [view, setView] = useState<View>("teachers");
  const [criticalOnly, setCriticalOnly] = useState(true);

  const teacherBias = useMutation({ mutationFn: computeTeacherBias });
  const evaluatorBias = useMutation({ mutationFn: () => computeEvaluatorBias() });
  const { data: biasConfig } = useQuery({ queryKey: ["evaluator-bias-config"], queryFn: getEvaluatorBiasConfig });
  const normalize = useMutation({
    mutationFn: () => setEvaluatorBiasNormalization(true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluator-bias-config"] }),
  });

  function refresh() {
    if (view === "teachers") teacherBias.mutate();
    else evaluatorBias.mutate();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const teacherRows = (teacherBias.data ?? []).filter((r) => !criticalOnly || r.is_outlier);
  const evaluatorRows = (evaluatorBias.data ?? []).filter((r) => !criticalOnly || r.is_outlier);
  const loading = view === "teachers" ? teacherBias.isPending : evaluatorBias.isPending;
  const hasError = view === "teachers" ? teacherBias.isError : evaluatorBias.isError;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="seg">
          <label className={`seg-opt ${view === "teachers" ? "active" : ""}`}>
            <input type="radio" name="biais" checked={view === "teachers"} onChange={() => setView("teachers")} style={{ display: "none" }} />
            Enseignants
          </label>
          <label className={`seg-opt ${view === "evaluators" ? "active" : ""}`}>
            <input type="radio" name="biais" checked={view === "evaluators"} onChange={() => setView("evaluators")} style={{ display: "none" }} />
            Étudiants évaluateurs
          </label>
        </div>
        <label className="radio" style={{ marginLeft: "auto" }}>
          <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} />
          Anomalies critiques uniquement
        </label>
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
          {loading ? "Calcul…" : "Actualiser"}
        </button>
      </div>

      {hasError && (
        <div style={{ fontSize: 12, color: "#F43F5E" }}>Échec du calcul des biais. Réessayez avec "Actualiser".</div>
      )}

      <div className="card" style={{ padding: "8px 26px 20px" }}>
        {view === "teachers" ? (
          <table className="table">
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Critère audité</th>
                <th>Note moyenne</th>
                <th>Indice de déviation (z-score)</th>
                <th>Gravité</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((b, i) => {
                const sev = severity(b.z_score);
                return (
                  <tr key={b.teacher_id + b.criteria_id + i}>
                    <td style={{ fontWeight: 600 }}>{b.teacher_name}</td>
                    <td className="text-muted">{b.criteria_name}</td>
                    <td>{fmtNumber(b.avg_score, 2)}</td>
                    <td style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(b.z_score, 2)}</td>
                    <td>
                      <span className={`tag ${sev.tag}`}>{sev.label}</span>
                    </td>
                  </tr>
                );
              })}
              {!loading && !hasError && teacherRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                    Aucune anomalie détectée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Évaluateur (haché)</th>
                <th>Note moyenne donnée</th>
                <th>Indice de déviation (z-score)</th>
                <th>Gravité</th>
              </tr>
            </thead>
            <tbody>
              {evaluatorRows.map((b) => {
                const sev = severity(b.z_score);
                return (
                  <tr key={b.student_id}>
                    <td style={{ fontWeight: 600, fontFamily: "var(--font-heading)" }}>{pseudonym(b.student_id)}</td>
                    <td>{fmtNumber(b.avg_score_given, 2)}</td>
                    <td style={{ fontFamily: "var(--font-heading)" }}>{fmtNumber(b.z_score, 2)}</td>
                    <td>
                      <span className={`tag ${sev.tag}`}>{sev.label}</span>
                    </td>
                  </tr>
                );
              })}
              {!loading && !hasError && evaluatorRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                    Aucune anomalie détectée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: "20px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "var(--color-tile)",
          maxWidth: 620,
        }}
      >
        <div className="card-kicker" style={{ color: "var(--color-neutral-900)" }}>
          Correction
        </div>
        <div style={{ fontSize: 14, color: "var(--color-neutral-900)" }}>
          La normalisation par évaluateur ramène les notes sur une même échelle. S'applique uniquement au biais des évaluateurs (aucune
          normalisation par critère enseignant n'est exposée par le backend).
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: "flex-start", background: "var(--color-neutral-900)", color: "var(--color-bg)", borderColor: "var(--color-neutral-500)" }}
          onClick={() => normalize.mutate()}
          disabled={normalize.isPending || !!biasConfig?.normalization_enabled}
        >
          {normalize.isPending
            ? "Application…"
            : biasConfig?.normalization_enabled
              ? "Normalisation appliquée"
              : "Appliquer la normalisation"}
        </button>
        {normalize.isError && <span style={{ fontSize: 12, color: "#F43F5E" }}>Échec de l'application de la normalisation.</span>}
      </div>
    </div>
  );
}
