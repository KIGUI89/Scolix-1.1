import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCourse,
  createDepartment,
  listCourses,
  listDepartments,
  listSemesters,
  updateCourse,
  updateDepartment,
  type CourseInput,
} from "../../services/sync";
import { listTeachersDirectory } from "../../services/teachers";
import { Modal } from "../../components/ui/Modal";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { EditButton } from "../../components/ui/EditButton";
import { DeleteButton } from "../../components/ui/DeleteButton";
import { HiddenRowsBanner } from "../../components/ui/HiddenRowsBanner";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { useAffichageContent } from "../../store/affichageContentStore";
import { useHiddenRows } from "../../hooks/useHiddenRows";
import { useSearchContent } from "../../store/searchContentStore";
import { useBreadcrumb } from "../../store/breadcrumbStore";
import { ACADEMIC_LEVELS } from "../../lib/academicLevels";
import type { Course, Department } from "../../types/sync";

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const SELECT_CARD_STYLE: CSSProperties = {
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export function DepartmentFormModal({ department, onClose }: { department?: Department; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(department?.code ?? "");
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      department
        ? updateDepartment(department.id, { code, name, description: description || null })
        : createDepartment({ code, name, description: description || null, is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["heatmap-by-semester"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Le code doit être unique (30 caractères maximum)."),
  });

  return (
    <Modal title={department ? "Modifier le département" : "Nouveau département"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>Code</label>
          <input className="input" required maxLength={30} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field">
          <label>Nom</label>
          <input className="input" required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            className="input"
            rows={3}
            style={{ minHeight: 72, padding: "8px 10px" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

function CourseFormModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });

  const [form, setForm] = useState<CourseInput>({
    university_id: course.university_id,
    code: course.code,
    name: course.name,
    description: course.description,
    level: course.level,
    cohort: course.cohort,
    credit: course.credit,
    is_active: course.is_active,
    teacher: course.teacher,
    secondary_teachers: course.secondary_teachers,
    department: course.department,
    semester: course.semester,
    grade: course.grade,
  });
  const [error, setError] = useState<string | null>(null);

  const eligibleSecondary = teachers.filter(
    (t) => t.department === form.department && t.id !== form.teacher
  );

  const mutation = useMutation({
    mutationFn: () => updateCourse(course.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Vérifiez les champs (le code doit être unique)."),
  });

  function set<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title="Modifier la matière" onClose={onClose}>
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
          <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Code</label>
            <input className="input" required value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className="field">
            <label>Crédits</label>
            <input
              className="input"
              type="number"
              min={0}
              required
              value={form.credit}
              onChange={(e) => set("credit", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="field">
          <label>Enseignant principal</label>
          <select
            className="input"
            required
            value={form.teacher}
            onChange={(e) => {
              const teacherId = e.target.value;
              setForm((f) => ({
                ...f,
                teacher: teacherId,
                secondary_teachers: f.secondary_teachers.filter((id) => id !== teacherId),
              }));
            }}
          >
            <option value="">—</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Professeurs secondaires</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
            {eligibleSecondary.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Aucun autre enseignant dans cette filière.
              </span>
            )}
            {eligibleSecondary.map((t) => (
              <label key={t.id} className="radio">
                <input
                  type="checkbox"
                  checked={form.secondary_teachers.includes(t.id)}
                  onChange={() =>
                    set("secondary_teachers", toggleInArray(form.secondary_teachers, t.id))
                  }
                />
                {t.full_name}
              </label>
            ))}
          </div>
        </div>
        <label className="radio">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Matière active
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

/** Création d'une matière : sélection en cascade filière → niveau → semestre.
 * Chaque étape réinitialise les suivantes quand on change un choix précédent ;
 * les champs restants (nom, code, enseignant…) ne s'affichent qu'une fois les
 * trois premiers choisis, comme demandé. */
function CourseCreateFormModal({
  defaultDepartment,
  duplicateFrom,
  onClose,
}: {
  defaultDepartment?: string | null;
  /** Pré-remplit le formulaire depuis une matière existante — pour la
   * "dupliquer" vers une autre filière (code/identifiant ERP laissés vides
   * car uniques ; la filière n'est PAS reprise, pour forcer un choix actif). */
  duplicateFrom?: Course | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });

  const [department, setDepartment] = useState(defaultDepartment ?? "");
  const [level, setLevel] = useState(duplicateFrom?.level ?? "");
  const [semester, setSemester] = useState(duplicateFrom?.semester ?? "");

  const [name, setName] = useState(duplicateFrom?.name ?? "");
  const [code, setCode] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [cohort, setCohort] = useState(duplicateFrom?.cohort ?? "");
  const [credit, setCredit] = useState(duplicateFrom?.credit ?? 0);
  const [teacher, setTeacher] = useState(duplicateFrom?.teacher ?? "");
  // Non pré-rempli même en duplication : les profs secondaires de la matière
  // source appartiennent à sa filière d'origine, pas à la filière de
  // destination — on force un choix actif parmi les profs de la nouvelle filière.
  const [secondaryTeachers, setSecondaryTeachers] = useState<string[]>([]);
  const [description, setDescription] = useState(duplicateFrom?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const cascadeComplete = !!department && !!level && !!semester;
  const eligibleSecondary = teachers.filter((t) => t.department === department && t.id !== teacher);

  const mutation = useMutation({
    mutationFn: () =>
      createCourse({
        university_id: universityId,
        code,
        name,
        description,
        level,
        cohort,
        credit,
        is_active: true,
        teacher,
        secondary_teachers: secondaryTeachers,
        department,
        semester,
        grade: null,
      } as CourseInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["courses-all"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    },
    onError: () => setError("Impossible d'enregistrer. Vérifiez les champs (le code doit être unique)."),
  });

  return (
    <Modal title={duplicateFrom ? `Dupliquer « ${duplicateFrom.name} »` : "Nouvelle matière"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {duplicateFrom && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Choisissez la filière de destination — le code et l'identifiant ERP doivent être ressaisis (uniques).
          </div>
        )}
        <div className="field">
          <label>Filière</label>
          <select
            className="input"
            required
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setLevel("");
              setSemester("");
              setSecondaryTeachers([]);
            }}
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Niveau</label>
          <select
            className="input"
            required
            disabled={!department}
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setSemester("");
            }}
          >
            <option value="">—</option>
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Semestre</label>
          <select className="input" required disabled={!level} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">—</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {level && semesters.length === 0 && (
            <div className="text-muted" style={{ fontSize: 12 }}>
              Aucun semestre enregistré — créez-en un d'abord dans "Semestres".
            </div>
          )}
        </div>

        {cascadeComplete && (
          <>
            <div style={{ borderTop: "1px solid var(--color-divider)", margin: "4px 0" }} />
            <div className="field">
              <label>Nom</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Code</label>
                <input className="input" required value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="field">
                <label>Identifiant ERP</label>
                <input className="input" required value={universityId} onChange={(e) => setUniversityId(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Promotion</label>
                <input className="input" required value={cohort} onChange={(e) => setCohort(e.target.value)} />
              </div>
              <div className="field">
                <label>Crédits</label>
                <input className="input" type="number" min={0} required value={credit} onChange={(e) => setCredit(Number(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label>Enseignant principal</label>
              <select
                className="input"
                required
                value={teacher}
                onChange={(e) => {
                  const teacherId = e.target.value;
                  setTeacher(teacherId);
                  setSecondaryTeachers((ids) => ids.filter((id) => id !== teacherId));
                }}
              >
                <option value="">—</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Professeurs secondaires</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                {eligibleSecondary.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Aucun autre enseignant dans cette filière.
                  </span>
                )}
                {eligibleSecondary.map((t) => (
                  <label key={t.id} className="radio">
                    <input
                      type="checkbox"
                      checked={secondaryTeachers.includes(t.id)}
                      onChange={() => setSecondaryTeachers((ids) => toggleInArray(ids, t.id))}
                    />
                    {t.full_name}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                className="input"
                rows={3}
                style={{ minHeight: 72, padding: "8px 10px" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-secondary" disabled={!cascadeComplete || mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CoursDepartments() {
  const qc = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [sortByName, setSortByName] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null | undefined>(undefined);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { hidden, hide, restore, isHidden } = useHiddenRows("hidden-courses");

  usePageCreateAction(
    selectedDept ? "Nouvelle matière" : "Nouveau département",
    () => (selectedDept ? setCreatingCourse(true) : setEditingDept(null))
  );

  const selectedDeptData = departments.find((d) => d.id === selectedDept);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", selectedDept],
    queryFn: () => listCourses({ department: selectedDept as string }),
    enabled: !!selectedDept,
  });

  const toggleCourseActive = useMutation({
    mutationFn: (c: Course) => updateCourse(c.id, { is_active: !c.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses", selectedDept] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const results = useMemo(() => {
    let rows = courses;
    if (!showActive) rows = rows.filter((c) => !c.is_active);
    if (!showInactive) rows = rows.filter((c) => c.is_active);
    if (!showHidden) rows = rows.filter((c) => !isHidden(c.id));
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    if (sortByName) rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [courses, showActive, showInactive, showHidden, isHidden, search, sortByName]);

  function goToDepartments() {
    setSelectedDept(null);
    setSearch("");
  }

  useSearchContent(
    selectedDept
      ? () => (
          <input
            className="input"
            placeholder="Rechercher une matière par nom ou code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        )
      : null
  );

  useBreadcrumb([
    { label: "Cours", onClick: goToDepartments },
    ...(selectedDept ? [{ label: selectedDeptData?.name ?? "" }] : []),
  ]);

  useAffichageContent(() =>
    !selectedDept ? (
      <div className="text-muted" style={{ fontSize: 13, padding: "4px 4px" }}>
        Sélectionnez une filière pour accéder aux critères d'affichage.
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {!selectedDept && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 20 }}>
          {departments.map((d) => (
            <div key={d.id} className="card select-card" style={SELECT_CARD_STYLE}>
              <div
                role="button"
                tabIndex={0}
                style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                onClick={() => setSelectedDept(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedDept(d.id);
                }}
              >
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
                  <div className="card-title" style={{ color: "var(--color-neutral-900)" }}>
                    {d.name}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
                    {d.code}
                  </div>
                </div>
                <span style={{ color: "var(--color-accent-900)", fontSize: 18 }}>→</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="tag tag-count">{d.courses_count} cours</span>
                <span className="tag tag-count">{d.teachers_count} enseignants</span>
              </div>
              <div
                style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                <EditButton onClick={() => setEditingDept(d)} />
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Aucun département enregistré.
            </div>
          )}
        </div>
      )}

      {selectedDept && (
        <>
          {courses.length === 0 ? (
            <div className="card" style={{ padding: 24 }}>
              <div className="text-muted">Aucune matière n'est rattachée à la filière {selectedDeptData?.name}.</div>
            </div>
          ) : (
            <>
              <HiddenRowsBanner count={hidden.size} show={showHidden} onToggle={() => setShowHidden((v) => !v)} />
              <div className="card" style={{ padding: "8px 26px 20px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Matière</th>
                    <th>Code</th>
                    <th>Enseignant principal</th>
                    <th>Semestre</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((c) => {
                    const hiddenRow = isHidden(c.id);
                    return (
                      <Fragment key={c.id}>
                        <tr
                          style={{ cursor: "pointer", opacity: hiddenRow ? 0.5 : 1 }}
                          onClick={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                        >
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ fontFamily: "var(--font-heading)" }}>{c.code}</td>
                          <td className="text-muted">{c.teacher_name}</td>
                          <td>
                            <span className="tag tag-sem">{c.semester_name}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <ToggleSwitch
                              variant="status"
                              checked={c.is_active}
                              onChange={() => toggleCourseActive.mutate(c)}
                              label={c.is_active ? "Désactiver la matière" : "Activer la matière"}
                            />
                          </td>
                          <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            {hiddenRow ? (
                              <button type="button" className="btn btn-ghost" onClick={() => restore(c.id)}>
                                Restaurer
                              </button>
                            ) : (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  title="Dupliquer vers une autre filière"
                                  onClick={() => setDuplicatingCourse(c)}
                                >
                                  Dupliquer
                                </button>
                                <EditButton onClick={() => setEditingCourse(c)} />
                                <DeleteButton
                                  onClick={() => {
                                    if (confirm(`Retirer la matière ${c.name} de l'affichage ? La donnée reste conservée en base.`)) hide(c.id);
                                  }}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedId === c.id && (
                          <tr>
                            <td colSpan={6} style={{ background: "var(--color-surface)", padding: "14px 18px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Identifiant ERP
                                  </div>
                                  <div>{c.university_id}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Crédits
                                  </div>
                                  <div>{c.credit}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Niveau / promotion
                                  </div>
                                  <div>
                                    {c.level} — {c.cohort}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Grade du professeur
                                  </div>
                                  <div>{c.grade_name ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Professeurs secondaires
                                  </div>
                                  <div>
                                    {c.secondary_teacher_names && c.secondary_teacher_names.length > 0
                                      ? c.secondary_teacher_names.join(", ")
                                      : "—"}
                                  </div>
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                  <div className="text-muted" style={{ fontSize: 11 }}>
                                    Description
                                  </div>
                                  <div>{c.description || "—"}</div>
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
                      <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                        Aucune matière ne correspond aux filtres sélectionnés.
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

      {editingDept !== undefined && <DepartmentFormModal department={editingDept ?? undefined} onClose={() => setEditingDept(undefined)} />}
      {editingCourse && <CourseFormModal course={editingCourse} onClose={() => setEditingCourse(null)} />}
      {creatingCourse && <CourseCreateFormModal defaultDepartment={selectedDept} onClose={() => setCreatingCourse(false)} />}
      {duplicatingCourse && (
        <CourseCreateFormModal duplicateFrom={duplicatingCourse} onClose={() => setDuplicatingCourse(null)} />
      )}
    </div>
  );
}
