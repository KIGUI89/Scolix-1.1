import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSemester, listSemesters, updateSemester, type SemesterInput } from "../../services/sync";
import { Modal } from "../../components/ui/Modal";
import { EditButton } from "../../components/ui/EditButton";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { useSearchContent } from "../../store/searchContentStore";
import type { Semester } from "../../types/sync";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function SemesterFormModal({ semester, onClose }: { semester?: Semester; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SemesterInput>({
    name: semester?.name ?? "",
    academic_year: semester?.academic_year ?? "",
    start_date: semester?.start_date ?? "",
    end_date: semester?.end_date ?? "",
    is_active: semester?.is_active ?? false,
  });
  const mutation = useMutation({
    mutationFn: () => (semester ? updateSemester(semester.id, form) : createSemester(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["semesters"] });
      onClose();
    },
  });

  return (
    <Modal title={semester ? "Modifier le semestre" : "Nouveau semestre"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Libellé</label>
          <input
            className="input"
            required
            placeholder="Semestre 1 — 2026/2027"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Année académique</label>
          <input
            className="input"
            required
            placeholder="2026/2027"
            value={form.academic_year}
            onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Début</label>
            <input
              className="input"
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Fin</label>
            <input
              className="input"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
          Le statut actif/inactif est recalculé automatiquement selon la date du jour et les dates de ce
          semestre — au plus un semestre est actif à la fois, sans intervention manuelle.
        </p>
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

export function Semesters() {
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<Semester | null | undefined>(undefined);

  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });

  const filtered = useMemo(() => {
    let rows = semesters;
    if (activeOnly) rows = rows.filter((s) => s.is_active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.academic_year.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [semesters, activeOnly, search]);

  usePageCreateAction("Nouveau semestre", () => setEditing(null));

  useSearchContent(() => (
    <input
      className="input"
      placeholder="Rechercher par libellé ou année…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      autoFocus
    />
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <label className="radio" style={{ marginLeft: "auto" }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Actifs uniquement
        </label>
        <button type="button" className="btn btn-secondary btn-icon" title="Nouveau semestre" aria-label="Nouveau semestre" onClick={() => setEditing(null)}>
          +
        </button>
      </div>
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Semestre</th>
              <th>Année académique</th>
              <th>Durée de la période</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{s.name}</td>
                <td>{s.academic_year}</td>
                <td className="text-muted">
                  {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                </td>
                <td>
                  <span
                    className={`tag ${s.is_active ? "tag-active" : "tag-inactive"}`}
                    title="Statut recalculé automatiquement selon la date du jour — au plus un semestre est actif à la fois."
                  >
                    {s.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <EditButton onClick={() => setEditing(s)} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun semestre ne correspond à la recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <SemesterFormModal semester={editing ?? undefined} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
