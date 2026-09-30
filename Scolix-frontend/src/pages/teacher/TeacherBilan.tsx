import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { getTeacherRecommendations } from "../../services/aiEngine";
import { getSelfAssessment, listCriteria, saveSelfAssessment } from "../../services/evaluations";
import { fmtNumber } from "../../lib/format";

const LIKERT = ["Insuffisant", "Perfectible", "Satisfaisant", "Bien", "Excellent"];
const LIKERT_TO_SCORE = [2, 4, 6, 8, 10];

export function TeacherBilan() {
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.teacher_profile_id;
  const qc = useQueryClient();

  const { data: recos, isError: recosError, isLoading: recosLoading } = useQuery({
    queryKey: ["teacher-recos-self", teacherId],
    queryFn: () => getTeacherRecommendations(teacherId!),
    enabled: !!teacherId,
    retry: false,
  });

  const { data: assessment, isLoading: assessmentLoading } = useQuery({ queryKey: ["self-assessment"], queryFn: getSelfAssessment });
  const { data: criteria = [] } = useQuery({ queryKey: ["criteria"], queryFn: listCriteria });
  const activeCriteria = criteria.filter((c) => c.is_active);

  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const save = useMutation({
    mutationFn: () =>
      saveSelfAssessment(
        activeCriteria.filter((c) => answers[c.id] != null).map((c) => ({ criteria_id: c.id, score: LIKERT_TO_SCORE[answers[c.id] - 1] })),
      ),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["self-assessment"] });
    },
  });

  function startEditing() {
    setAnswers({});
    setEditing(true);
  }

  const answered = Object.keys(answers).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 12, alignItems: "start" }}>
      <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, background: "var(--color-tile)", boxShadow: "var(--shadow-tile)" }}>
        <span className="card-title">Formations suggérées</span>
        {recosLoading && (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Chargement…
          </div>
        )}
        {recosError && (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Recommandations indisponibles pour le moment.
          </div>
        )}
        {recos && recos.recommendations.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Aucune recommandation pour le moment — vos scores ne signalent pas de critère à renforcer.
          </div>
        )}
        {recos?.recommendations.map((r) => (
          <div key={r.criteria_id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, marginRight: "auto" }}>{r.criteria_name}</span>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {fmtNumber(r.avg_score, 1)}/10
              </span>
            </div>
            <p className="card-body" style={{ fontSize: 12 }}>
              {r.recommendation}
            </p>
            {r.trainings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {r.trainings.map((t) =>
                  t.url ? (
                    <a key={t.id} href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--color-accent-700)" }}>
                      {t.title}
                    </a>
                  ) : (
                    <span key={t.id} className="text-muted" style={{ fontSize: 12 }}>
                      {t.title}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="card-title">Auto-évaluation</span>
        <p className="card-body" style={{ fontSize: 13 }}>
          Comparez votre propre lecture des six critères avec vos résultats étudiants.
        </p>

        {!editing && (
          <>
            {assessmentLoading ? (
              <div className="text-muted" style={{ fontSize: 13 }}>
                Chargement…
              </div>
            ) : assessment ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Soumise le {new Date(assessment.submitted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} — {assessment.semester_name}
                </div>
                {assessment.responses.map((r) => (
                  <div key={r.criteria} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
                    <span style={{ marginRight: "auto" }}>{r.criteria_name}</span>
                    <span>{r.score}/10</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 13 }}>
                Aucune auto-évaluation soumise pour le moment.
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={startEditing} disabled={activeCriteria.length === 0}>
                {assessment ? "Mettre à jour mon auto-évaluation" : "Remplir mon auto-évaluation"}
              </button>
            </div>
          </>
        )}

        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {activeCriteria.map((c) => (
              <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13 }}>{c.name}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {LIKERT.map((label, i) => {
                    const n = i + 1;
                    const on = answers[c.id] === n;
                    return (
                      <button
                        key={label}
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          minWidth: 100,
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 2,
                          padding: "8px 12px",
                          borderColor: on ? "var(--color-accent)" : undefined,
                          background: on ? "var(--color-accent-100)" : undefined,
                        }}
                        onClick={() => setAnswers((a) => ({ ...a, [c.id]: n }))}
                      >
                        <span style={{ fontSize: 14 }}>{n}</span>
                        <span className="text-muted" style={{ fontSize: 10 }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {save.isError && <div style={{ fontSize: 12, color: "#F43F5E" }}>Impossible d'enregistrer l'auto-évaluation. Réessayez.</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" disabled={answered < activeCriteria.length || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Envoi…" : "Envoyer"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={save.isPending}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
