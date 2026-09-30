import { Modal } from "../ui/Modal";
import { fmtNumber } from "../../lib/format";
import type { MySubmission } from "../../types/evaluation";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function SubmissionDetailModal({ submission, onClose }: { submission: MySubmission; onClose: () => void }) {
  return (
    <Modal title={submission.course_name} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="text-muted" style={{ fontSize: 12 }}>
          {submission.course_code} · {submission.teacher_name} · reçue le {fmtDate(submission.submitted_at)}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>
            {submission.global_score != null ? fmtNumber(Number(submission.global_score), 1) : "—"}
          </span>
          <span className="text-muted" style={{ fontSize: 13 }}>
            /100 · recommandation {submission.recommendation_score}/10
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {submission.responses.map((r) => (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
              <span style={{ marginRight: "auto" }}>{r.criteria_name}</span>
              <span>{r.score}/10</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "var(--color-neutral-200)" }}>
              <div style={{ height: 5, borderRadius: 999, width: `${(r.score / 10) * 100}%`, background: "var(--color-accent)" }} />
            </div>
          </div>
        ))}
      </div>

      {submission.responses.some((r) => r.comment) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}>
          <span className="text-muted" style={{ fontSize: 12 }}>
            Commentaire
          </span>
          {submission.responses
            .filter((r) => r.comment)
            .map((r) => (
              <p key={r.id} className="card-body" style={{ fontSize: 13, margin: 0 }}>
                {r.comment}
              </p>
            ))}
        </div>
      )}
    </Modal>
  );
}
