import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEnrollment, listCourses, listGrades, listStudents, updateCourse } from "../../services/sync";
import { listTeachersDirectory } from "../../services/teachers";
import { CourseEnrollPicker } from "./CourseEnrollPicker";
import { usePageChrome } from "../../store/pageChromeStore";

type Section = "student" | "teacher";

function StudentEnrollSection() {
  const qc = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => listStudents() });

  const [studentId, setStudentId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      Promise.all(courseIds.map((courseId) => createEnrollment({ student: studentId, course: courseId, is_active: isActive }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      setStudentId("");
      setCourseIds([]);
      setSuccess(true);
      setError(null);
    },
    onError: () => {
      setSuccess(false);
      setError("Impossible d'enrôler cet étudiant (inscription à un de ces cours déjà existante ?).");
    },
  });

  return (
    <form
      className="card"
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}
      onSubmit={(e) => {
        e.preventDefault();
        setSuccess(false);
        mutation.mutate();
      }}
    >
      <div className="field">
        <label>Étudiant</label>
        <select className="input" required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">—</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} ({s.student_code})
            </option>
          ))}
        </select>
      </div>
      <CourseEnrollPicker departmentId={departmentId} courseIds={courseIds} onDepartmentChange={setDepartmentId} onCourseIdsChange={setCourseIds} />
      <label className="radio">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Inscription active
      </label>
      {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
      {success && <div style={{ fontSize: 12, color: "var(--color-success)" }}>Étudiant enrôlé avec succès.</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-secondary" disabled={mutation.isPending || courseIds.length === 0}>
          {mutation.isPending ? "Enrôlement…" : "Enrôler"}
        </button>
      </div>
    </form>
  );
}

function TeacherGradeSection() {
  const qc = useQueryClient();
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers-directory"], queryFn: () => listTeachersDirectory() });
  const { data: allCourses = [] } = useQuery({ queryKey: ["courses-all"], queryFn: () => listCourses() });
  const { data: grades = [] } = useQuery({ queryKey: ["grades"], queryFn: listGrades });

  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const teacherCourses = useMemo(() => allCourses.filter((c) => c.teacher === teacherId), [allCourses, teacherId]);
  const selectedCourse = allCourses.find((c) => c.id === courseId);

  const mutation = useMutation({
    mutationFn: () => updateCourse(courseId, { grade: gradeId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-all"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      setSuccess(true);
      setError(null);
    },
    onError: () => {
      setSuccess(false);
      setError("Impossible d'enregistrer le grade pour ce cours.");
    },
  });

  return (
    <form
      className="card"
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}
      onSubmit={(e) => {
        e.preventDefault();
        setSuccess(false);
        mutation.mutate();
      }}
    >
      <div className="field">
        <label>Professeur</label>
        <select
          className="input"
          required
          value={teacherId}
          onChange={(e) => {
            setTeacherId(e.target.value);
            setCourseId("");
            setGradeId("");
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
        <label>Cours</label>
        <select
          className="input"
          required
          disabled={!teacherId}
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            const picked = allCourses.find((course) => course.id === e.target.value);
            setGradeId(picked?.grade ?? "");
          }}
        >
          <option value="">—</option>
          {teacherCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        {teacherId && teacherCourses.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Ce professeur n'a aucun cours affecté.
          </div>
        )}
      </div>
      <div className="field">
        <label>Grade pour ce cours</label>
        <select className="input" disabled={!courseId} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
          <option value="">—</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {selectedCourse && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Grade actuel : {selectedCourse.grade_name ?? "aucun"}
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
      {success && <div style={{ fontSize: 12, color: "var(--color-success)" }}>Grade attribué avec succès.</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-secondary" disabled={mutation.isPending || !courseId}>
          {mutation.isPending ? "Enregistrement…" : "Attribuer"}
        </button>
      </div>
    </form>
  );
}

export function Enrollment() {
  const [section, setSection] = useState<Section>("student");
  usePageChrome({ hideCreate: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="seg" style={{ width: "fit-content" }}>
        <label className={`seg-opt ${section === "student" ? "active" : ""}`}>
          <input type="radio" name="enroll-section" checked={section === "student"} onChange={() => setSection("student")} style={{ display: "none" }} />
          Étudiant
        </label>
        <label className={`seg-opt ${section === "teacher" ? "active" : ""}`}>
          <input type="radio" name="enroll-section" checked={section === "teacher"} onChange={() => setSection("teacher")} style={{ display: "none" }} />
          Professeur
        </label>
      </div>

      {section === "student" ? <StudentEnrollSection /> : <TeacherGradeSection />}
    </div>
  );
}
