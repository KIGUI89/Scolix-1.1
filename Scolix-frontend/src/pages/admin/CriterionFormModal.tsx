import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createCriterion, updateCriterion, type CriterionInput } from "../../services/evaluations";
import type { Criterion } from "../../types/campaign";

const CATEGORY_OPTIONS = [
  { value: "PEDAGOGY", label: "Pédagogie" },
  { value: "CONTENT", label: "Contenu du cours" },
  { value: "BEHAVIOR", label: "Comportement" },
  { value: "AVAILABILITY", label: "Disponibilité" },
  { value: "ORGANIZATION", label: "Organisation" },
];

interface CriterionFormModalProps {
  criterion?: Criterion;
  onClose: () => void;
}

export function CriterionFormModal({ criterion, onClose }: CriterionFormModalProps) {
  const qc = useQueryClient();

  const [form, setForm] = useState<CriterionInput>({
    name: criterion?.name ?? "",
    description: criterion?.description ?? "",
    category: criterion?.category ?? CATEGORY_OPTIONS[0].value,
    is_active: criterion?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => (criterion ? updateCriterion(criterion.id, form) : createCriterion(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["criteria"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer ce critère. Vérifiez les champs."),
  });

  function set<K extends keyof CriterionInput>(key: K, value: CriterionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title={criterion ? "Modifier le critère" : "Nouveau critère"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Nom</label>
          <input className="input" required maxLength={150} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Catégorie</label>
          <select className="input" required value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            className="input"
            rows={3}
            style={{ minHeight: 72, padding: "8px 10px" }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <label className="radio">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Critère actif
        </label>
        {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-secondary" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
