import { apiClient } from "../lib/apiClient";
import type { Teacher, TeacherComments, TeacherDashboard, TeacherInput, TeacherScores } from "../types/teacher";

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

// /api/sync/teachers/ — full CRUD directory used by the teacher list screen.
export async function listTeachersDirectory(params: { search?: string; is_active?: boolean } = {}): Promise<Teacher[]> {
  const { data } = await apiClient.get("/sync/teachers/", { params });
  return unwrap<Teacher>(data);
}

export async function createTeacher(input: TeacherInput): Promise<Teacher> {
  const { data } = await apiClient.post<Teacher>("/sync/teachers/", input);
  return data;
}

export async function updateTeacher(id: string, input: Partial<TeacherInput>): Promise<Teacher> {
  const { data } = await apiClient.patch<Teacher>(`/sync/teachers/${id}/`, input);
  return data;
}

// /api/teachers/ — read-only aggregate views used by the teacher profile screen.
export async function getTeacher(id: string): Promise<Teacher> {
  const { data } = await apiClient.get<Teacher>(`/teachers/${id}/`);
  return data;
}

export async function getTeacherScores(id: string, semesterId?: string): Promise<TeacherScores> {
  const { data } = await apiClient.get<TeacherScores>(`/teachers/${id}/scores/`, {
    params: semesterId ? { semester_id: semesterId } : {},
  });
  return data;
}

export async function getTeacherComments(id: string, semesterId?: string): Promise<TeacherComments> {
  const { data } = await apiClient.get<TeacherComments>(`/teachers/${id}/comments/`, {
    params: semesterId ? { semester_id: semesterId } : {},
  });
  return data;
}

// /api/evaluations/teacher-dashboard/ — self-service view for the TEACHER role only.
export async function getTeacherDashboard(): Promise<TeacherDashboard> {
  const { data } = await apiClient.get<TeacherDashboard>("/evaluations/teacher-dashboard/");
  return data;
}

export interface TeacherCourseDetail {
  course_id: string;
  course_code: string;
  course_name: string;
  semester_name: string;
  total_evaluations: number;
  average_score: number | string | null;
  criteria_averages: { criteria_id: string; criteria_name: string; category: string; average_score: number; total_responses: number }[];
  comments: { criteria_name: string; score: number; comment: string; created_at: string }[];
}

// /api/evaluations/teacher-dashboard/courses/{id}/ — détail d'un module évalué (TEACHER uniquement).
export async function getTeacherCourseDetail(courseId: string): Promise<TeacherCourseDetail> {
  const { data } = await apiClient.get<TeacherCourseDetail>(`/evaluations/teacher-dashboard/courses/${courseId}/`);
  return data;
}
