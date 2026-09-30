import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCampaignCriteria } from "../../services/campaigns";
import { getDraft, getMyCampaigns, getMyCourses, saveDraft, submitEvaluation } from "../../services/evaluations";
import type { EvaluableCourse } from "../../types/evaluation";

const LIKERT = ["Insuffisant", "Perfectible", "Satisfaisant", "Bien", "Excellent"];
const LIKERT_TO_SCORE = [2, 4, 6, 8, 10];

export function StudentEvalForm() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedCourseId = searchParams.get("course");
  const requestedTeacherId = searchParams.get("teacher");
  const { data: courses = [], isLoading: coursesLoading } = useQuery({ queryKey: ["my-courses"], queryFn: getMyCourses });
  const { data: campaigns = [] } = useQuery({ queryKey: ["my-campaigns"], queryFn: getMyCampaigns, enabled: courses.length === 0 && !coursesLoading });

  const pending = courses.filter((c) => !c.already_submitted);
  // Un cours peut apparaître deux fois dans `pending` (principal + secondaire) :
  // le teacher_id désambiguïse laquelle des deux tâches a été demandée.
  const requested = requestedCourseId
    ? pending.find((c) => c.course_id === requestedCourseId && (!requestedTeacherId || c.teacher_id === requestedTeacherId)) ?? null
    : null;
  // Locked in once chosen: a background refetch of my-courses (e.g. after saving a
  // draft) must not yank the form away mid-flow just because the course dropped out
  // of `pending` (already_submitted flips true right after a successful submit).
  const [active, setActive] = useState<EvaluableCourse | null>(null);
  useEffect(() => {
    if (active) return;
    const next = requested ?? (pending.length === 1 ? pending[0] : null);
    if (next) setActive(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, pending.length]);

  if (!active) {
    if (coursesLoading) return null;
    if (pending.length > 1) {
      return (
        <div style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ margin: 0 }}>Cours à évaluer</h4>
          {pending.map((c) => (
            <button
              key={c.course_id + c.teacher_id}
              type="button"
              className="card"
              style={{ padding: "16px 20px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => setActive(c)}
            >
              <div>
                <div className="card-title">{c.course_name}</div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  {c.teacher_name}
                  {c.is_secondary_teacher && " (secondaire)"} · {c.campaign_title}
                </div>
              </div>
              <span style={{ color: "var(--color-accent-700)", fontSize: 18 }}>→</span>
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="card" style={{ padding: 24, maxWidth: 620 }}>
        <div className="card-kicker">À jour</div>
        <div className="card-title" style={{ margin: "6px 0" }}>
          Aucun cours à évaluer pour le moment.
        </div>
        {campaigns.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {campaigns.map((c) => (
              <div key={c.campaign_id} className="text-muted" style={{ fontSize: 13 }}>
                {c.campaign_title} — {c.submitted_courses}/{c.total_courses} cours évalués
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <EvalForm course={active} onDone={() => { setActive(null); qc.invalidateQueries({ queryKey: ["my-courses"] }); }} />;
}

function EvalForm({ course, onDone }: { course: EvaluableCourse; onDone: () => void }) {
  const qc = useQueryClient();
  const { data: lines = [] } = useQuery({ queryKey: ["campaign-criteria", course.campaign_id], queryFn: () => getCampaignCriteria(course.campaign_id) });
  const { data: draft, isLoading: draftLoading } = useQuery({
    queryKey: ["eval-draft", course.campaign_id, course.course_id, course.teacher_id],
    queryFn: () => getDraft(course.campaign_id, course.course_id, course.teacher_id),
    enabled: course.has_draft,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [recommendation, setRecommendation] = useState(5);
  const [draftApplied, setDraftApplied] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (draftApplied || (course.has_draft && draftLoading)) return;
    if (draft) {
      const a: Record<string, number> = {};
      let c = "";
      for (const r of draft.responses) {
        const idx = LIKERT_TO_SCORE.indexOf(r.score);
        if (idx >= 0) a[r.criteria] = idx + 1;
        if (r.comment) c = r.comment;
      }
      setAnswers(a);
      setComment(c);
      if (draft.recommendation_score != null) setRecommendation(draft.recommendation_score);
    }
    setDraftApplied(true);
  }, [draft, draftLoading, course.has_draft, draftApplied]);

  const answered = Object.keys(answers).length;
  const total = lines.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  const submit = useMutation({
    mutationFn: () =>
      submitEvaluation({
        campaign_id: course.campaign_id,
        course_id: course.course_id,
        teacher_id: course.teacher_id,
        recommendation_score: recommendation,
        responses: lines.map((l, i) => ({
          criteria_id: l.criteria,
          score: LIKERT_TO_SCORE[answers[l.criteria] - 1] ?? 0,
          comment: i === 0 && comment ? comment : undefined,
        })),
      }),
    onSuccess: () => setDone(true),
  });

  const saveDraftMutation = useMutation({
    mutationFn: () =>
      saveDraft({
        campaign_id: course.campaign_id,
        course_id: course.course_id,
        teacher_id: course.teacher_id,
        recommendation_score: recommendation,
        responses: lines
          .filter((l) => answers[l.criteria] != null)
          .map((l, i) => ({
            criteria_id: l.criteria,
            score: LIKERT_TO_SCORE[answers[l.criteria] - 1],
            comment: i === 0 && comment ? comment : undefined,
          })),
      }),
    onSuccess: () => {
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
      qc.invalidateQueries({ queryKey: ["my-courses"] });
    },
  });

  if (done) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 620 }}>
        <div className="card-kicker">Merci</div>
        <div className="card-title" style={{ margin: "6px 0" }}>
          Votre évaluation a été enregistrée. Elle n'est pas transmise nominativement à l'enseignant.
        </div>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>
            {course.course_name} — {course.teacher_name}
            {course.is_secondary_teacher && " (secondaire)"}
          </h4>
          <span className="tag tag-outline">Anonyme</span>
        </div>
        <p style={{ fontSize: 13, margin: 0 }}>
          Vos réponses ne sont jamais transmises nominativement à l'enseignant (identifiant pseudonymisé par hachage). L'administration conserve un accès à votre identité pour la gestion des campagnes.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: "var(--color-neutral-200)" }}>
            <div style={{ height: 6, background: "var(--color-accent)", width: `${pct}%` }} />
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {answered}/{total}
          </span>
        </div>
      </div>

      {lines.map((line) => (
        <div key={line.id} className="card" style={{ padding: "20px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="card-title" style={{ marginRight: "auto" }}>
                {line.criteria_name}
              </span>
              <span className="text-muted" style={{ fontSize: 11 }}>
                Poids {Number(line.percentage)} %
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {line.criteria_description}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {LIKERT.map((label, i) => {
              const n = i + 1;
              const on = answers[line.criteria] === n;
              return (
                <button
                  key={label}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    minWidth: 118,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    padding: "10px 14px",
                    borderColor: on ? "var(--color-accent)" : undefined,
                    background: on ? "var(--color-accent-100)" : undefined,
                  }}
                  onClick={() => setAnswers((a) => ({ ...a, [line.criteria]: n }))}
                >
                  <span style={{ fontSize: 15 }}>{n}</span>
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card" style={{ padding: "20px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <label>Recommanderiez-vous cet enseignant ? (0 = pas du tout, 10 = tout à fait)</label>
          <input
            type="range"
            min={0}
            max={10}
            value={recommendation}
            onChange={(e) => setRecommendation(Number(e.target.value))}
            style={{ accentColor: "var(--color-accent)" }}
          />
          <span className="text-muted" style={{ fontSize: 12 }}>
            {recommendation} / 10
          </span>
        </div>
        <div className="field">
          <label>Commentaire libre (facultatif)</label>
          <textarea
            className="input"
            style={{ minHeight: 72, padding: "8px 10px" }}
            placeholder="Ce qui a bien fonctionné, ce qui pourrait être amélioré…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        {submit.isError && <div style={{ fontSize: 12, color: "#F43F5E" }}>Impossible d'envoyer l'évaluation. Réessayez.</div>}
        {saveDraftMutation.isError && <div style={{ fontSize: 12, color: "#F43F5E" }}>Impossible d'enregistrer le brouillon. Réessayez.</div>}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={answered < total || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Envoi…" : "Envoyer l'évaluation"}
          </button>
          <button type="button" className="btn btn-ghost" disabled={answered === 0 || saveDraftMutation.isPending} onClick={() => saveDraftMutation.mutate()}>
            {saveDraftMutation.isPending ? "Enregistrement…" : savedMsg ? "Enregistré ✓" : "Enregistrer et reprendre plus tard"}
          </button>
        </div>
      </div>
    </div>
  );
}
