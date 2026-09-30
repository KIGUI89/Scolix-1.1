import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCampaigns, putCampaignCriteria } from "../../services/campaigns";
import { getClassificationConfig, listCriteria, updateClassificationConfig, updateCriterion } from "../../services/evaluations";
import { usePageActionStore } from "../../store/pageActionStore";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { EditButton } from "../../components/ui/EditButton";
import { CriterionFormModal } from "./CriterionFormModal";
import type { Criterion } from "../../types/campaign";

const CATEGORY_LABELS: Record<string, string> = {
  PEDAGOGY: "Pédagogie",
  CONTENT: "Contenu du cours",
  BEHAVIOR: "Comportement",
  AVAILABILITY: "Disponibilité",
  ORGANIZATION: "Organisation",
};

export function CriteriaWeights() {
  const qc = useQueryClient();
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns });
  const { data: criteria = [] } = useQuery({ queryKey: ["criteria"], queryFn: listCriteria });
  const { data: config } = useQuery({ queryKey: ["classification-config"], queryFn: getClassificationConfig });

  const [campaignId, setCampaignId] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null | undefined>(undefined);

  const toggleCriterionActive = useMutation({
    mutationFn: (c: Criterion) => updateCriterion(c.id, { is_active: !c.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) setCampaignId(campaigns[0].id);
  }, [campaigns, campaignId]);

  useEffect(() => {
    if (!selectedCampaign) return;
    const next: Record<string, number> = {};
    for (const line of selectedCampaign.campaign_criteria) {
      next[line.criteria] = Number(line.percentage);
    }
    setWeights(next);
  }, [selectedCampaign]);

  const activeCriteria = useMemo(() => criteria.filter((c) => c.is_active), [criteria]);
  const total = useMemo(() => activeCriteria.reduce((sum, c) => sum + (weights[c.id] ?? 0), 0), [weights, activeCriteria]);
  const valid = total <= 100;

  const saveWeights = useMutation({
    mutationFn: () => {
      const activeIds = new Set(activeCriteria.map((c) => c.id));
      const lines = Object.entries(weights)
        .filter(([criteriaId, pct]) => pct > 0 && activeIds.has(criteriaId))
        .map(([criteriaId, pct]) => ({ criteria: criteriaId, percentage: pct }));
      return putCampaignCriteria(campaignId, lines);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const [thresholds, setThresholds] = useState({ exceptional: 80, progression: 60 });
  useEffect(() => {
    if (config) setThresholds({ exceptional: config.exceptional_threshold, progression: config.progression_threshold });
  }, [config]);

  const saveThresholds = useMutation({
    mutationFn: () =>
      updateClassificationConfig({ exceptional_threshold: thresholds.exceptional, progression_threshold: thresholds.progression }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classification-config"] }),
  });

  const setPageAction = usePageActionStore((s) => s.setAction);
  useEffect(() => {
    setPageAction({ label: "Nouveau critère", onClick: () => setEditingCriterion(null) });
    return () => setPageAction(null);
  }, [setPageAction]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>Critères et pondération</h4>
          <select className="input" style={{ width: "auto", minHeight: 32 }} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
          Créez et gérez les critères d'évaluation (utilisez le « + » en haut de page pour en ajouter un), puis répartissez leur
          pondération pour la campagne sélectionnée. Seuls les critères actifs peuvent être pondérés.
        </p>
        {criteria.map((c) => {
          const value = weights[c.id] ?? 0;
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "12px 0",
                borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ marginRight: "auto" }}>
                  <div style={{ fontSize: 14 }}>{c.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </div>
                </div>
                {c.is_active && (
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, minWidth: 52, textAlign: "right" }}>{value} %</span>
                )}
                <ToggleSwitch
                  checked={c.is_active}
                  onChange={() => toggleCriterionActive.mutate(c)}
                  label={c.is_active ? "Désactiver" : "Activer"}
                />
                <EditButton onClick={() => setEditingCriterion(c)} />
              </div>
              {c.is_active ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={value}
                    onChange={(e) => setWeights((w) => ({ ...w, [c.id]: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: "var(--color-accent)" }}
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => setWeights((w) => ({ ...w, [c.id]: Math.max(0, value - 5) }))}>
                    −
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setWeights((w) => ({ ...w, [c.id]: Math.min(40, value + 5) }))}>
                    +
                  </button>
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: 12 }}>
                  Critère inactif — non disponible pour la pondération des campagnes.
                </div>
              )}
            </div>
          );
        })}
        {criteria.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Aucun critère créé pour le moment.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid var(--color-divider)", paddingTop: 16 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>Total {total} %</span>
          <span className={`tag ${valid ? "tag-accent" : "tag-crit"}`}>{valid ? "Valide" : "Total dépassé (max 100 %)"}</span>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            style={{ marginLeft: "auto" }}
            disabled={!valid || !campaignId || saveWeights.isPending}
            title="Enregistrer la pondération"
            aria-label="Enregistrer la pondération"
            onClick={() => saveWeights.mutate()}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Seuils de classification</h4>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, marginRight: "auto" }}>Exceptionnel (score &gt;)</span>
            <input
              className="input"
              style={{ width: 96, minHeight: 32 }}
              type="number"
              min={0}
              max={100}
              value={thresholds.exceptional}
              onChange={(e) => setThresholds((t) => ({ ...t, exceptional: Number(e.target.value) }))}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, marginRight: "auto" }}>En progression (score &gt;)</span>
            <input
              className="input"
              style={{ width: 96, minHeight: 32 }}
              type="number"
              min={0}
              max={100}
              value={thresholds.progression}
              onChange={(e) => setThresholds((t) => ({ ...t, progression: Number(e.target.value) }))}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="text-muted" style={{ fontSize: 14, marginRight: "auto" }}>
              À accompagner (score ≤)
            </span>
            <input className="input" style={{ width: 96, minHeight: 32 }} value={thresholds.progression} readOnly />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ alignSelf: "flex-start" }}
            disabled={saveThresholds.isPending}
            onClick={() => saveThresholds.mutate()}
          >
            {saveThresholds.isPending ? "Enregistrement…" : "Enregistrer les seuils"}
          </button>
        </div>
      </div>

      {editingCriterion !== undefined && (
        <CriterionFormModal criterion={editingCriterion ?? undefined} onClose={() => setEditingCriterion(undefined)} />
      )}
    </div>
  );
}
