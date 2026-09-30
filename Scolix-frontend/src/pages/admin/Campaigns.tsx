import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateCampaign, cancelCampaign, closeCampaign, getCampaignTeachers, listCampaigns } from "../../services/campaigns";
import { listTeachersDirectory } from "../../services/teachers";
import { CampaignFormModal } from "./CampaignFormModal";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { extractErrorMessage } from "../../lib/errors";
import type { CampaignStatus } from "../../types/campaign";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  CLOSED: "Clôturée",
  CANCELLED: "Annulée",
};
const STATUS_TAG: Record<CampaignStatus, string> = {
  DRAFT: "tag-watch",
  ACTIVE: "tag-accent",
  CLOSED: "tag-neutral",
  CANCELLED: "tag-crit",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function Campaigns() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });

  const coverageQueries = useQueries({
    queries: campaigns.map((c) => ({
      queryKey: ["campaign-teachers", c.id],
      queryFn: () => getCampaignTeachers(c.id),
    })),
  });

  usePageCreateAction("Nouvelle campagne", () => setCreating(true));

  const [actingId, setActingId] = useState<string | null>(null);

  const statusAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "activate" | "close" | "cancel" }) => {
      setActingId(id);
      setActionError(null);
      if (action === "activate") return activateCampaign(id);
      if (action === "close") return closeCampaign(id);
      return cancelCampaign(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (err) => setActionError(extractErrorMessage(err, "Action impossible sur cette campagne.")),
    onSettled: () => setActingId(null),
  });
  const pending = statusAction.isPending;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <h4 style={{ margin: 0 }}>Campagnes en cours</h4>
          {campaigns.map((c, i) => {
            const covered = coverageQueries[i]?.data ?? [];
            const submissions = covered.reduce((sum, t) => sum + t.submissions_count, 0);
            const coveragePct = teachers.length > 0 ? Math.round((covered.length / teachers.length) * 100) : 0;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "16px 0",
                  borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span className="card-title" style={{ marginRight: "auto" }}>
                    {c.title}
                  </span>
                  <span className={`tag ${STATUS_TAG[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Clôture {fmtDate(c.end_date)}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: 13 }}>
                  {c.semester_name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--color-neutral-200)" }}>
                    <div style={{ height: 6, background: "var(--color-accent)", width: `${coveragePct}%` }} />
                  </div>
                  <span style={{ fontSize: 13, minWidth: 128, textAlign: "right" }}>
                    {covered.length}/{teachers.length} enseignants · {submissions} réponses
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(c.status === "DRAFT" || c.status === "CLOSED") && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={pending}
                      onClick={() => statusAction.mutate({ id: c.id, action: "activate" })}
                    >
                      {pending && actingId === c.id ? "Activation…" : "Activer"}
                    </button>
                  )}
                  {c.status === "ACTIVE" && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending}
                      onClick={() => statusAction.mutate({ id: c.id, action: "close" })}
                    >
                      {pending && actingId === c.id ? "Clôture…" : "Clôturer"}
                    </button>
                  )}
                  {(c.status === "DRAFT" || c.status === "ACTIVE") && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending}
                      onClick={() => statusAction.mutate({ id: c.id, action: "cancel" })}
                    >
                      {pending && actingId === c.id ? "Annulation…" : "Annuler"}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" disabled title="Aucune action de relance exposée par le backend">
                    Relancer maintenant
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => navigate("/analytics")}>
                    Suivi détaillé
                  </button>
                </div>
              </div>
            );
          })}
          {campaigns.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucune campagne créée pour le moment.
            </div>
          )}
          {actionError && <div style={{ fontSize: 12, color: "#F43F5E" }}>{actionError}</div>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ margin: 0 }}>Séquence d'envoi</h4>
          {[
            { when: "J+0", label: "Ouverture de la campagne", note: "Notification initiale à tous les étudiants concernés" },
            { when: "J+3", label: "Première relance", note: "Aux étudiants n'ayant pas encore répondu" },
            { when: "J+5", label: "Deuxième relance", note: "Rappel ciblé, ton renforcé" },
            { when: "J+7", label: "Clôture", note: "Fin de la collecte, verrouillage des réponses" },
          ].map((s) => (
            <div key={s.when} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 13, minWidth: 44, color: "#1B9B00" }}>{s.when}</span>
              <div>
                <div style={{ fontSize: 14 }}>{s.label}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {s.note}
                </div>
              </div>
            </div>
          ))}
          <div className="text-muted" style={{ fontSize: 12, borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}>
            File asynchrone Celery + Redis — jusqu'à 1 000 e-mails / minute.
          </div>
        </div>
      </div>

      {creating && <CampaignFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
