import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGrade, listGrades, updateGrade } from "../../services/sync";
import { Modal } from "../../components/ui/Modal";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { EditButton } from "../../components/ui/EditButton";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { useAffichageContent } from "../../store/affichageContentStore";
import { useSearchContent } from "../../store/searchContentStore";
import type { Grade } from "../../types/sync";

type StatusFilter = "active" | "inactive";

function GradeFormModal({ grade, onClose }: { grade?: Grade; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(grade?.name ?? "");
  const [description, setDescription] = useState(grade?.description ?? "");
  const [rankOrder, setRankOrder] = useState(grade?.rank_order ?? 0);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      grade
        ? updateGrade(grade.id, { name, description: description || null, rank_order: rankOrder })
        : createGrade({ name, description: description || null, rank_order: rankOrder, is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Le nom d'un grade doit être unique (100 caractères maximum)."),
  });
  return (
    <Modal title={grade ? "Modifier le grade" : "Nouveau grade"} onClose={onClose}>
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
          <input className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="input" rows={3} style={{ minHeight: 72, padding: "8px 10px" }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>Rang (0 = grade le plus élevé)</label>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            required
            value={rankOrder}
            onChange={(e) => setRankOrder(Math.max(0, Math.round(Number(e.target.value))))}
          />
        </div>
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

export function Grades() {
  const qc = useQueryClient();
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: listGrades });
  const [editing, setEditing] = useState<Grade | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const toggleActive = useMutation({
    mutationFn: (g: Grade) => updateGrade(g.id, { is_active: !g.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });

  const filtered = useMemo(() => {
    let rows = grades.filter((g) => g.is_active === (status === "active"));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((g) => g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => a.rank_order - b.rank_order);
  }, [grades, status, search]);

  usePageCreateAction("Nouveau grade", () => setEditing(null));

  useSearchContent(() => (
    <input
      className="input"
      placeholder="Rechercher un grade (nom, description…)"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      autoFocus
    />
  ));

  useAffichageContent(() => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {([
        { value: "active", label: "Actifs" },
        { value: "inactive", label: "Inactifs" },
      ] as { value: StatusFilter; label: string }[]).map((opt) => (
        <label
          key={opt.value}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "6px 8px",
            borderRadius: 6,
            cursor: "pointer",
            background: status === opt.value ? "var(--color-neutral-200)" : "transparent",
          }}
        >
          <input type="radio" name="grade-filter" checked={status === opt.value} onChange={() => setStatus(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  ));

  return (
    <div className="card" style={{ padding: "8px 26px 20px" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Rang</th>
            <th>Description</th>
            <th>Enseignants</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g) => (
            <tr key={g.id}>
              <td style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-bg)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-heading)",
                    fontSize: 12,
                    background: "var(--color-neutral-800)",
                  }}
                >
                  GR
                </span>
                {g.name}
              </td>
              <td>
                <span className="tag tag-rank">#{g.rank_order}</span>
              </td>
              <td className={g.description ? "" : "text-muted"} style={g.description ? undefined : { fontStyle: "italic" }}>
                {g.description || "Aucune description fournie"}
              </td>
              <td>{g.teachers_count}</td>
              <td>
                <ToggleSwitch checked={g.is_active} onChange={() => toggleActive.mutate(g)} label={g.is_active ? "Désactiver" : "Activer"} />
              </td>
              <td style={{ textAlign: "right" }}>
                <EditButton onClick={() => setEditing(g)} />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                Aucun grade ne correspond à ce filtre.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {editing !== undefined && <GradeFormModal grade={editing ?? undefined} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
