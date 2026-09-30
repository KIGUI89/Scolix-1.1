import { apiClient } from "../lib/apiClient";
import type { Course, Department, DepartmentByLevel, Enrollment, Grade, MyEnrollmentRow, Semester, Student } from "../types/sync";

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get("/sync/departments/");
  return unwrap<Department>(data);
}

export type DepartmentInput = Pick<Department, "code" | "name" | "description" | "is_active">;

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const { data } = await apiClient.post<Department>("/sync/departments/", input);
  return data;
}

export async function updateDepartment(id: string, input: Partial<DepartmentInput>): Promise<Department> {
  const { data } = await apiClient.patch<Department>(`/sync/departments/${id}/`, input);
  return data;
}

/** Suppression logique : le backend passe is_active à false, rien n'est effacé en base. */
export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/sync/departments/${id}/`);
}

export async function listSemesters(): Promise<Semester[]> {
  const { data } = await apiClient.get("/sync/semesters/");
  return unwrap<Semester>(data);
}

export type SemesterInput = Pick<Semester, "name" | "academic_year" | "start_date" | "end_date" | "is_active">;

export async function createSemester(input: SemesterInput): Promise<Semester> {
  const { data } = await apiClient.post<Semester>("/sync/semesters/", input);
  return data;
}

export async function updateSemester(id: string, input: Partial<SemesterInput>): Promise<Semester> {
  const { data } = await apiClient.patch<Semester>(`/sync/semesters/${id}/`, input);
  return data;
}

export async function listGrades(): Promise<Grade[]> {
  const { data } = await apiClient.get("/sync/grades/");
  return unwrap<Grade>(data);
}

export type GradeInput = Pick<Grade, "name" | "description" | "rank_order" | "is_active">;

export async function createGrade(input: GradeInput): Promise<Grade> {
  const { data } = await apiClient.post<Grade>("/sync/grades/", input);
  return data;
}

export async function updateGrade(id: string, input: Partial<GradeInput>): Promise<Grade> {
  const { data } = await apiClient.patch<Grade>(`/sync/grades/${id}/`, input);
  return data;
}

export async function listStudents(params: { search?: string; level?: string; department?: string } = {}): Promise<Student[]> {
  const { data } = await apiClient.get("/sync/students/", { params });
  return unwrap<Student>(data);
}

export type StudentInput = Pick<
  Student,
  "university_id" | "student_code" | "first_name" | "last_name" | "email" | "phone" | "department" | "level" | "cohort" | "academic_year" | "is_active"
>;

export async function createStudent(input: StudentInput): Promise<Student> {
  const { data } = await apiClient.post<Student>("/sync/students/", input);
  return data;
}

export async function updateStudent(id: string, input: Partial<StudentInput>): Promise<Student> {
  const { data } = await apiClient.patch<Student>(`/sync/students/${id}/`, input);
  return data;
}

export async function listDepartmentsByLevel(level: string): Promise<DepartmentByLevel[]> {
  const { data } = await apiClient.get<DepartmentByLevel[]>("/sync/students/departments_by_level/", {
    params: { level },
  });
  return data;
}

export async function listCourses(params: { department?: string; level?: string; semester?: string } = {}): Promise<Course[]> {
  const { data } = await apiClient.get("/sync/courses/", { params });
  return unwrap<Course>(data);
}

export type CourseInput = Pick<
  Course,
  | "university_id"
  | "code"
  | "name"
  | "description"
  | "level"
  | "cohort"
  | "credit"
  | "is_active"
  | "teacher"
  | "secondary_teachers"
  | "department"
  | "semester"
  | "grade"
>;

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data } = await apiClient.post<Course>("/sync/courses/", input);
  return data;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<Course> {
  const { data } = await apiClient.patch<Course>(`/sync/courses/${id}/`, input);
  return data;
}

export async function listEnrollments(): Promise<Enrollment[]> {
  const { data } = await apiClient.get("/sync/enrollments/");
  return unwrap<Enrollment>(data);
}

export interface EnrollmentInput {
  student: string;
  course: string;
  is_active: boolean;
}

export async function createEnrollment(input: EnrollmentInput): Promise<Enrollment> {
  const { data } = await apiClient.post<Enrollment>("/sync/enrollments/", input);
  return data;
}

export async function updateEnrollment(id: string, input: Partial<EnrollmentInput>): Promise<Enrollment> {
  const { data } = await apiClient.patch<Enrollment>(`/sync/enrollments/${id}/`, input);
  return data;
}

/** GET /sync/enrollments/mine/ — the logged-in student's own active
 * enrollments (course + teacher), self-scoped server-side. Used by the
 * "Rapport" page to list the teachers the student can report on. */
export async function listMyEnrollments(): Promise<MyEnrollmentRow[]> {
  const { data } = await apiClient.get<MyEnrollmentRow[]>("/sync/enrollments/mine/");
  return data;
}
