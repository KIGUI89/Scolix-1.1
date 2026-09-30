import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDepartmentsByLevel, listStudents, updateStudent } from "../../services/sync";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { EditButton } from "../../components/ui/EditButton";
import { DeleteButton } from "../../components/ui/DeleteButton";
import { HiddenRowsBanner } from "../../components/ui/HiddenRowsBanner";
import { StudentFormModal } from "./StudentFormModal";
import { useAffichageContent } from "../../store/affichageContentStore";
import { usePageActionStore } from "../../store/pageActionStore";
import { usePageChrome } from "../../store/pageChromeStore";
import { useHiddenRows } from "../../hooks/useHiddenRows";
import { useSearchContent } from "../../store/searchContentStore";
import { useBreadcrumb } from "../../store/breadcrumbStore";
import type { Student } from "../../types/sync";

const LEVELS = [
  { code: "L1", label: "Licence 1" },
  { code: "L2", label: "Licence 2" },
  { code: "L3", label: "Licence 3" },
  { code: "M1", label: "Master 1" },
  { code: "M2", label: "Master 2" },
];

const SELECT_CARD_STYLE: CSSProperties = {
  padding: "20px 22px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  textAlign: "left",
  cursor: "pointer",
};

export function Students() {
  const qc = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [sortByName, setSortByName] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const { data: allStudents = [] } = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });
  const { hidden, hide, restore, isHidden } = useHiddenRows("hidden-students");

  const levelCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allStudents.forEach((s) => {
      map[s.level] = (map[s.level] ?? 0) + 1;
    });
    return map;
  }, [allStudents]);

  const selectedLevelLabel = LEVELS.find((l) => l.code === selectedLevel)?.label ?? selectedLevel ?? "";

  const { data: departments = [] } = useQuery({
    queryKey: ["students-departments-by-level", selectedLevel],
    queryFn: () => listDepartmentsByLevel(selectedLevel as string),
    enabled: !!selectedLevel,
  });

  const selectedDeptLabel = departments.find((d) => d.id === selectedDept)?.name ?? "";

  const { data: students = [] } = useQuery({
    queryKey: ["students-list", selectedLevel, selectedDept],
    queryFn: () => listStudents({ level: selectedLevel as string, department: selectedDept as string }),
    enabled: !!selectedLevel && !!selectedDept,
  });

  const toggleActive = useMutation({
    mutationFn: (s: Student) => updateStudent(s.id, { is_active: !s.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students-list", selectedLevel, selectedDept] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });

  const results = useMemo(() => {
    let rows = students;
    if (!showActive) rows = rows.filter((s) => !s.is_active);
    if (!showInactive) rows = rows.filter((s) => s.is_active);
    if (!showHidden) rows = rows.filter((s) => !isHidden(s.id));
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) => s.full_name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    }
    if (sortByName) rows = [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
    return rows;
  }, [students, showActive, showInactive, showHidden, isHidden, search, sortByName]);

  const isListStep = !!selectedLevel && !!selectedDept;

  // Toujours visible, contrairement à l'ancien comportement qui masquait le
  // "+" tant que niveau + filière n'étaient pas choisis : le formulaire sait
  // déjà demander ces deux champs lui-même (voir StudentFormModal), donc rien
  // n'empêche de créer un étudiant directement depuis n'importe quelle étape.
  usePageChrome({ hideCreate: false });

  const setPageAction = usePageActionStore((s) => s.setAction);
  useEffect(() => {
    setPageAction({ label: "Nouvel étudiant", onClick: () => setCreating(true) });
    return () => setPageAction(null);
  }, [setPageAction]);

  useAffichageContent(() =>
    !selectedLevel || !selectedDept ? (
      <div className="text-muted" style={{ fontSize: 13, padding: "4px 4px" }}>
        Sélectionnez un niveau puis une filière pour accéder aux critères d'affichage.
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          <input type="checkbox" checked={showActive} onChange={(e) => setShowActive(e.target.checked)} />
          Actifs
        </label>
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
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Inactifs
        </label>
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
    )
  );

  useSearchContent(
    isListStep
      ? () => (
          <input
            className="input"
            placeholder="Rechercher un étudiant par nom, matricule ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        )
      : null
  );

  useBreadcrumb([
    { label: "Étudiants", onClick: goToLevels },
    ...(selectedLevel ? [{ label: selectedLevelLabel, onClick: goToDepartments }] : []),
    ...(selectedDept ? [{ label: selectedDeptLabel }] : []),
  ]);

  function goToLevels() {
    setSelectedLevel(null);
    setSelectedDept(null);
    setSearch("");
  }
  function goToDepartments() {
    setSelectedDept(null);
    setSearch("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {!selectedLevel && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 20 }}>
          {LEVELS.map((l) => (
            <button key={l.code} type="button" className="card select-card" onClick={() => setSelectedLevel(l.code)} style={SELECT_CARD_STYLE}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-neutral-900)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-heading)",
                  fontSize: 14,
                  background: "var(--color-bg)",
                }}
              >
                {l.code}
              </span>
              <div style={{ marginRight: "auto" }}>
                <div className="card-title">{l.label}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {levelCounts[l.code] ?? 0} étudiants
                </div>
              </div>
              <span style={{ color: "var(--color-accent-700)", fontSize: 18 }}>→</span>
            </button>
          ))}
        </div>
      )}

      {selectedLevel && !selectedDept && (
        <>
          {departments.length === 0 ? (
            <div className="card" style={{ padding: 24 }}>
              <div className="text-muted">Aucune filière n'est rattachée au niveau {selectedLevelLabel}.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 20 }}>
              {departments.map((d) => (
                <button key={d.id} type="button" className="card select-card" onClick={() => setSelectedDept(d.id)} style={SELECT_CARD_STYLE}>
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-neutral-900)",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-heading)",
                      fontSize: 13,
                      background: "var(--color-bg)",
                    }}
                  >
                    {d.code}
                  </span>
                  <div style={{ marginRight: "auto" }}>
                    <div className="card-title">{d.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {d.students_count} étudiants
                    </div>
                  </div>
                  <span style={{ color: "var(--color-accent-700)", fontSize: 18 }}>→</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedLevel && selectedDept && (
        <>
          {students.length === 0 ? (
            <div className="card" style={{ padding: 24 }}>
              <div className="text-muted">Aucun étudiant n'est inscrit dans la filière {selectedDeptLabel} pour ce niveau.</div>
            </div>
          ) : (
            <>
              <HiddenRowsBanner count={hidden.size} show={showHidden} onToggle={() => setShowHidden((v) => !v)} />
              <div className="card" style={{ padding: "8px 26px 20px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Matricule</th>
                    <th>E-mail</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((s) => {
                    const hiddenRow = isHidden(s.id);
                    return (
                      <Fragment key={s.id}>
                        <tr
                          style={{ cursor: "pointer", opacity: hiddenRow ? 0.5 : 1 }}
                          onClick={() => setExpandedId((id) => (id === s.id ? null : s.id))}
                        >
                          <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                          <td style={{ fontFamily: "var(--font-heading)" }}>{s.student_code}</td>
                          <td className="text-muted">{s.email}</td>
                          <td>
                            <span className={`tag ${s.is_active ? "tag-active" : "tag-inactive"}`}>{s.is_active ? "Actif" : "Inactif"}</span>
                          </td>
                          <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            {hiddenRow ? (
                              <button type="button" className="btn btn-ghost" onClick={() => restore(s.id)}>
                                Restaurer
                              </button>
                            ) : (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                                <ToggleSwitch
                                  checked={s.is_active}
                                  onChange={() => toggleActive.mutate(s)}
                                  label={s.is_active ? "Désactiver" : "Activer"}
                                />
                                <EditButton onClick={() => setEditing(s)} />
                                <DeleteButton
                                  onClick={() => {
                                    if (confirm(`Retirer ${s.full_name} de l'affichage ? La donnée reste conservée en base.`)) hide(s.id);
                                  }}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedId === s.id && (
                          <tr>
                            <td colSpan={5} style={{ background: "var(--color-surface)", padding: "14px 18px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Téléphone
                                  </div>
                                  <div>{s.phone || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Identifiant ERP
                                  </div>
                                  <div>{s.university_id}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Promotion
                                  </div>
                                  <div>{s.cohort || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Année académique
                                  </div>
                                  <div>{s.academic_year || "—"}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                        Aucun étudiant ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}
        </>
      )}

      {editing && <StudentFormModal student={editing} onClose={() => setEditing(null)} />}
      {creating && (
        <StudentFormModal
          defaultLevel={selectedLevel ?? undefined}
          defaultDepartment={selectedDept ?? undefined}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
