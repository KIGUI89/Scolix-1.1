import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  computeEvaluatorBias,
  getClustering,
  getEvaluatorBiasConfig,
  getTeacherPrediction,
  retrainClustering,
  retrainTeacherPrediction,
  setEvaluatorBiasNormalization,
} from "../../services/aiEngine";
import { getTeacherScores, listTeachersDirectory } from "../../services/teachers";
import { listSemesters } from "../../services/sync";
import { PredictionChart } from "../../components/charts/PredictionChart";
import { Spinner } from "../../components/ui/Spinner";
import { pseudonym } from "../../lib/hash";
import { fmtNumber } from "../../lib/format";
import { usePageChrome } from "../../store/pageChromeStore";

export function MlAnalysis() {
  usePageChrome({ hideCreate: true });
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState("");

  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });

  // La lecture de la liste des semestres déclenche côté backend l'auto-correction
  // paresseuse des statuts actif/inactif (SemesterService.sync_statuses), qui
  // relance elle-même le réentraînement IA quand un semestre vient de basculer
  // (ModelTrainingService.retrain_for_semesters). On l'appelle donc aussi ici,
  // pour que cette page profite du même déclenchement automatique que les
  // autres écrans admin, et on rafraîchit les résultats déjà affichés au cas
  // où un réentraînement vient d'avoir lieu — sans recharger la page.
  const { data: semesters } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  useEffect(() => {
    if (semesters) {
      qc.invalidateQueries({ queryKey: ["clustering"] });
      qc.invalidateQueries({ queryKey: ["prediction"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters]);

  const evalBias = useMutation({ mutationFn: () => computeEvaluatorBias() });
  const { data: biasConfig } = useQuery({ queryKey: ["evaluator-bias-config"], queryFn: getEvaluatorBiasConfig });
  const normalize = useMutation({
    mutationFn: () => setEvaluatorBiasNormalization(true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluator-bias-config"] }),
  });

  const { data: clustering } = useQuery({ queryKey: ["clustering"], queryFn: getClustering });
  const retrainClusters = useMutation({
    mutationFn: () => retrainClustering(4),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clustering"] }),
  });

  const activeTeacher = teacherId || teachers[0]?.id || "";
  const { data: prediction } = useQuery({
    queryKey: ["prediction", activeTeacher],
    queryFn: () => getTeacherPrediction(activeTeacher),
    enabled: !!activeTeacher,
  });
  const { data: scores } = useQuery({
    queryKey: ["teacher-scores", activeTeacher],
    queryFn: () => getTeacherScores(activeTeacher),
    enabled: !!activeTeacher,
  });
  const retrainPrediction = useMutation({
    mutationFn: () => retrainTeacherPrediction(activeTeacher),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prediction", activeTeacher] }),
  });

  const outliers = (evalBias.data ?? []).filter((r) => r.is_outlier);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Détection de biais des évaluateurs</h4>
            <span className="tag tag-zscore">z-score</span>
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>
            {evalBias.data
              ? `${outliers.length} évaluateur(s) s'écartent de plus de 2 σ de la moyenne. La normalisation par évaluateur est réversible.`
              : "Lancez le calcul pour détecter les évaluateurs dont la notation s'écarte anormalement de la moyenne."}
          </p>
          {!evalBias.data && (
            <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={() => evalBias.mutate()} disabled={evalBias.isPending}>
              {evalBias.isPending ? "Calcul…" : "Calculer"}
            </button>
          )}
          {evalBias.isError && (
            <span style={{ fontSize: 12, color: "#F43F5E" }}>Échec du calcul des biais d'évaluateurs.</span>
          )}
          {evalBias.data && (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Évaluateur (haché)</th>
                    <th>Moyenne</th>
                    <th>z-score</th>
                    <th>Tendance</th>
                  </tr>
                </thead>
                <tbody>
                  {outliers.map((b) => (
                    <tr key={b.student_id}>
                      <td style={{ fontFamily: "var(--font-heading)", fontSize: 12 }}>{pseudonym(b.student_id)}</td>
                      <td>{fmtNumber(b.avg_score_given, 2)}</td>
                      <td>{fmtNumber(b.z_score, 2)}</td>
                      <td>
                        <span className="tag tag-neutral">{b.direction}</span>
                      </td>
                    </tr>
                  ))}
                  {outliers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: "12px 0" }}>
                        Aucun évaluateur atypique détecté.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => normalize.mutate()}
                  disabled={normalize.isPending || !!biasConfig?.normalization_enabled}
                >
                  {normalize.isPending
                    ? "Application…"
                    : biasConfig?.normalization_enabled
                      ? "Normalisation appliquée"
                      : "Appliquer la normalisation"}
                </button>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  Ajuste les notes de chaque évaluateur sur une échelle commune.
                </span>
              </div>
              {normalize.isError && (
                <span style={{ fontSize: 12, color: "#F43F5E" }}>Échec de l'application de la normalisation.</span>
              )}
            </>
          )}
        </div>

        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0 }}>Prédiction du score</h4>
            <select className="input" style={{ width: "auto", minHeight: 28, marginLeft: 8 }} value={activeTeacher} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
            <span className="tag tag-method" style={{ marginLeft: "auto" }}>
              régression linéaire
            </span>
          </div>
          {prediction?.status === "insufficient_data" || !scores || scores.semester_history.length < 2 ? (
            <div className="text-muted" style={{ fontSize: 13, padding: "20px 0" }}>
              Historique insuffisant pour une prédiction (minimum 2 semestres de données nécessaires — {scores?.semester_history.length ?? 0}{" "}
              disponible(s)).
            </div>
          ) : (
            <>
              <PredictionChart
                history={scores.semester_history.map((h) => ({ label: h.semester_name, value: h.avg_score }))}
                predicted={prediction?.predicted_score ?? null}
              />
              <div style={{ display: "flex", gap: 20, fontSize: 12 }} className="text-muted">
                <span>Historique {scores.semester_history.length} semestre(s)</span>
                {prediction?.r_squared != null && <span>R² = {fmtNumber(prediction.r_squared, 2)}</span>}
              </div>
            </>
          )}
          {prediction && prediction.category_trends.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Facteurs déterminants
              </div>
              {prediction.category_trends.map((f) => {
                const maxAbs = Math.max(...prediction.category_trends.map((c) => Math.abs(c.slope)), 0.01);
                const pct = (Math.abs(f.slope) / maxAbs) * 100;
                return (
                  <div key={f.category} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, minWidth: 132 }}>{f.category}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--color-neutral-200)" }}>
                      <div style={{ height: 6, background: "var(--color-accent)", width: `${pct}%` }} />
                    </div>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {f.slope > 0 ? "+" : ""}
                      {fmtNumber(f.slope, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ alignSelf: "flex-start" }}
            onClick={() => retrainPrediction.mutate()}
            disabled={!activeTeacher || retrainPrediction.isPending}
          >
            {retrainPrediction.isPending ? "Recalcul…" : "Recalculer la prédiction"}
          </button>
          {retrainPrediction.isError && (
            <span style={{ fontSize: 12, color: "#F43F5E" }}>Échec du recalcul de la prédiction.</span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>
            Clusters d'enseignants — K-Means, k = {clustering?.k ?? 4}
          </h4>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => retrainClusters.mutate()}
            disabled={retrainClusters.isPending}
            title="Force un nouveau calcul du clustering immédiatement, sans attendre l'arrivée de nouvelles données"
          >
            {retrainClusters.isPending && <Spinner />}
            {retrainClusters.isPending ? "Entraînement en cours…" : "Relancer l'entraînement"}
          </button>
        </div>
        {retrainClusters.isError && (
          <span style={{ fontSize: 12, color: "#F43F5E" }}>Échec de l'entraînement du clustering.</span>
        )}
        {clustering && clustering.clusters.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 20 }}>
            {clustering.clusters.map((c) => (
              <div key={c.cluster_id} style={{ border: "1px solid var(--color-divider)", padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="card-kicker">{c.size} enseignant(s)</div>
                <div className="card-title">{c.label}</div>
                <p style={{ fontSize: 13, margin: 0 }}>Score moyen du groupe : {fmtNumber(c.avg_global_score, 1)}/100.</p>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {c.teachers.map((t) => t.teacher_name).join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Aucun regroupement calculé pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
