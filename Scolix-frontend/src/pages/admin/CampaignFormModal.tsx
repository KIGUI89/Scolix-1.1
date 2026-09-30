import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createCampaign, listCampaigns, putCampaignCriteria } from "../../services/campaigns";
import { listCriteria } from "../../services/evaluations";
import { listSemesters } from "../../services/sync";
import type { CampaignInput } from "../../types/campaign";

export function CampaignFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const { data: criteria = [] } = useQuery({ queryKey: ["criteria"], queryFn: listCriteria });
  // Ordonnées -created_at côté backend : la première est la campagne la plus
  // récente, celle dont la page Critères affiche la pondération par défaut.
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const activeCriteria = useMemo(() => criteria.filter((c) => c.is_active), [criteria]);

  const [form, setForm] = useState<CampaignInput>({ title: "", description: "", semester: "", start_date: "", end_date: "" });
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultsApplied || activeCriteria.length === 0 || campaigns.length === 0) return;
    const activeIds = new Set(activeCriteria.map((c) => c.id));
    const next: Record<string, number> = {};
    for (const line of campaigns[0].campaign_criteria) {
      if (activeIds.has(line.criteria)) next[line.criteria] = Number(line.percentage);
    }
    setPercentages(next);
    setDefaultsApplied(true);
  }, [defaultsApplied, activeCriteria, campaigns]);

  const selectedIds = Object.keys(percentages);
  const total = Object.values(percentages).reduce((a, b) => a + b, 0);
  const totalOk = selectedIds.length > 0 && total === 100;

  function toggleCriterion(id: string, checked: boolean) {
    setPercentages((p) => {
      const next = { ...p };
      if (checked) next[id] = 0;
      else delete next[id];
      return next;
    });
  }

  function setPercentage(id: string, value: number) {
    setPercentages((p) => ({ ...p, [id]: Math.max(0, Math.min(100, value)) }));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const campaign = await createCampaign(form);
      const lines = Object.entries(percentages).map(([criteriaId, pct]) => ({ criteria: criteriaId, percentage: pct }));
      await putCampaignCriteria(campaign.id, lines);
      return campaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      onClose();
    },
    onError: () => setError("Impossible de créer la campagne. Vérifiez les dates et les critères."),
  });

  return (
    <Modal title="Nouvelle campagne" onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!totalOk) return;
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Titre</label>
          <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            className="input"
            style={{ minHeight: 64, padding: "8px 10px" }}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Semestre</label>
          <select className="input" required value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}>
            <option value="">—</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Ouverture</label>
            <input className="input" type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="field">
            <label>Clôture</label>
            <input className="input" type="date" required value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>

        <div className="field">
          <label>Critères d'évaluation</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeCriteria.map((c) => {
              const checked = c.id in percentages;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label className="radio" style={{ flex: 1 }}>
                    <input type="checkbox" checked={checked} onChange={(e) => toggleCriterion(c.id, e.target.checked)} />
                    {c.name}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    disabled={!checked}
                    value={checked ? percentages[c.id] : 0}
                    onChange={(e) => setPercentage(c.id, Number(e.target.value))}
                    style={{ width: 72, minHeight: 30, textAlign: "right" }}
                  />
                  <span className="text-muted" style={{ fontSize: 12, width: 12 }}>
                    %
                  </span>
                </div>
              );
            })}
            {activeCriteria.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Aucun critère actif disponible.
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--color-divider)", paddingTop: 10, marginTop: 4 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginRight: "auto" }}>Total {total} %</span>
            <span className={`tag ${totalOk ? "tag-accent" : "tag-crit"}`}>{totalOk ? "Valide" : "Doit totaliser 100 %"}</span>
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-secondary" disabled={!totalOk || mutation.isPending}>
            {mutation.isPending ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
