import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCourses, listDepartments } from "../../services/sync";

interface CourseEnrollPickerProps {
  departmentId: string;
  courseIds: string[];
  onDepartmentChange: (id: string) => void;
  onCourseIdsChange: (ids: string[]) => void;
  /** Hides the filière select and uses departmentId as a fixed, already-known context (e.g. when
   * embedded in a form that already picked the student's filière elsewhere). */
  lockDepartment?: boolean;
}

/** Shared "filière → cours" enrollment picker, reused both standalone on the Enrollment page and
 * embedded in the student creation form when "Enrôler l'étudiant" is checked. Choosing a filière
 * preselects all of its active courses; the admin can then deselect individual ones. */
export function CourseEnrollPicker({ departmentId, courseIds, onDepartmentChange, onCourseIdsChange, lockDepartment }: CourseEnrollPickerProps) {
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: allCourses = [], isSuccess: coursesLoaded } = useQuery({ queryKey: ["courses-all"], queryFn: () => listCourses() });

  const coursesInDept = useMemo(
    () => allCourses.filter((c) => c.department === departmentId && c.is_active),
    [allCourses, departmentId]
  );

  const [autoSelectedFor, setAutoSelectedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!coursesLoaded) return;
    if (!departmentId) {
      setAutoSelectedFor(null);
      return;
    }
    if (departmentId !== autoSelectedFor) {
      onCourseIdsChange(coursesInDept.map((c) => c.id));
      setAutoSelectedFor(departmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, coursesLoaded, coursesInDept]);

  function toggleCourse(id: string, checked: boolean) {
    onCourseIdsChange(checked ? [...courseIds, id] : courseIds.filter((c) => c !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!lockDepartment && (
        <div className="field">
          <label>Filière</label>
          <select className="input" required value={departmentId} onChange={(e) => onDepartmentChange(e.target.value)}>
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>Cours (toutes les matières de la filière sont présélectionnées)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {coursesInDept.map((c) => (
            <label key={c.id} className="radio">
              <input type="checkbox" checked={courseIds.includes(c.id)} onChange={(e) => toggleCourse(c.id, e.target.checked)} />
              {c.name} ({c.code})
            </label>
          ))}
        </div>
        {departmentId && coursesInDept.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Aucun cours actif dans cette filière.
          </div>
        )}
      </div>
    </div>
  );
}
