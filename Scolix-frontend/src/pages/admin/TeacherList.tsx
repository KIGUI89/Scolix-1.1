import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTeachersDirectory, updateTeacher } from "../../services/teachers";
import { TeacherFormModal } from "./TeacherFormModal";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { EditButton } from "../../components/ui/EditButton";
import { DeleteButton } from "../../components/ui/DeleteButton";
import { HiddenRowsBanner } from "../../components/ui/HiddenRowsBanner";
import { initials } from "../../lib/user";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { useAffichageContent } from "../../store/affichageContentStore";
import { useSearchContent } from "../../store/searchContentStore";
import { useHiddenRows } from "../../hooks/useHiddenRows";
import type { Teacher } from "../../types/teacher";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous les enseignants" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
];

export function TeacherList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortByName, setSortByName] = useState(false);
  const [editing, setEditing] = useState<Teacher | null | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });
  const { hidden, hide, restore, isHidden } = useHiddenRows("hidden-teachers");

  const toggleActive = useMutation({
    mutationFn: (t: Teacher) => updateTeacher(t.id, { is_active: !t.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers-directory"] }),
  });

  const filtered = useMemo(() => {
    let rows = teachers;
    if (status !== "all") rows = rows.filter((t) => t.is_active === (status === "active"));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((t) => t.full_name.toLowerCase().includes(q) || t.matricule.toLowerCase().includes(q));
    }
    if (!showHidden) rows = rows.filter((t) => !isHidden(t.id));
    if (sortByName) rows = [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
    return rows;
  }, [teachers, status, search, sortByName, showHidden, isHidden]);

  const total = teachers.length;
  const active = teachers.filter((t) => t.is_active).length;

  // Le "+" du bandeau (en haut de page) reste le point d'entrée pour ajouter un
  // enseignant — celui qui se trouvait dans le corps de la page est retiré.
  usePageCreateAction("Nouvel enseignant", () => setEditing(null));

  useSearchContent(() => (
    <input
      className="input"
      placeholder="Rechercher un enseignant (nom, matricule…)"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      autoFocus
    />
  ));

  useAffichageContent(() => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {STATUS_OPTIONS.map((opt) => (
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
          <input type="radio" name="teacher-status" checked={status === opt.value} onChange={() => setStatus(opt.value)} />
          {opt.label}
        </label>
      ))}
      <div style={{ borderTop: "1px solid var(--color-divider)", margin: "6px 0" }} />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          padding: "6px 8px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        <input type="checkbox" checked={sortByName} onChange={(e) => setSortByName(e.target.checked)} />
        Trier par nom
      </label>
    </div>
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 20 }}>
        <div className="card" style={{ padding: "20px 22px", background: "var(--color-tile)", boxShadow: "var(--shadow-tile)" }}>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>Total enseignants</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{total}</div>
        </div>
        <div className="card" style={{ padding: "20px 22px", background: "var(--color-tile)", boxShadow: "var(--shadow-tile)" }}>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>Actifs</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{active}</div>
        </div>
        <div className="card" style={{ padding: "20px 22px" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Inactifs
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{total - active}</div>
        </div>
      </div>

      <HiddenRowsBanner count={hidden.size} show={showHidden} onToggle={() => setShowHidden((v) => !v)} />

      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nom &amp; prénom</th>
              <th>Matricule</th>
              <th>Département</th>
              <th>Grade / spécialité</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const hiddenRow = isHidden(t.id);
              return (
                <Fragment key={t.id}>
                  <tr
                    style={{ cursor: "pointer", opacity: hiddenRow ? 0.5 : 1 }}
                    onClick={() => setExpandedId((id) => (id === t.id ? null : t.id))}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            color: "var(--color-accent-900)",
                            display: "grid",
                            placeItems: "center",
                            fontFamily: "var(--font-heading)",
                            fontSize: 12,
                            background: "var(--color-bg)",
                          }}
                        >
                          {initials(t.full_name)}
                        </span>
                        <span style={{ fontWeight: 600 }}>{t.full_name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-heading)" }}>{t.matricule}</td>
                    <td className="text-muted">{t.department_name}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.grade_name ?? "—"}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {t.specialty}
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ToggleSwitch
                        checked={t.is_active}
                        onChange={() => toggleActive.mutate(t)}
                        label={t.is_active ? "Désactiver" : "Activer"}
                      />
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      {hiddenRow ? (
                        <button type="button" className="btn btn-ghost" onClick={() => restore(t.id)}>
                          Restaurer
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ borderColor: "var(--color-neutral-500)", color: "var(--color-accent-800)" }}
                            onClick={() => navigate(`/enseignants/${t.id}`)}
                          >
                            Analyser
                          </button>
                          <EditButton onClick={() => setEditing(t)} />
                          <DeleteButton
                            onClick={() => {
                              if (confirm(`Retirer ${t.full_name} de l'affichage ? La donnée reste conservée en base.`)) hide(t.id);
                            }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--color-surface)", padding: "14px 18px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              E-mail
                            </div>
                            <div>{t.email}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Téléphone
                            </div>
                            <div>{t.phone || "—"}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Identifiant ERP
                            </div>
                            <div>{t.university_id}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Spécialité
                            </div>
                            <div>{t.specialty || "—"}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun enseignant ne correspond à la recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && <TeacherFormModal teacher={editing ?? undefined} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
