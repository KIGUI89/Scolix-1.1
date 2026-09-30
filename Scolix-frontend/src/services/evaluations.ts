import { isAxiosError } from "axios";
import { apiClient } from "../lib/apiClient";
import type { ClassificationConfig, Criterion } from "../types/campaign";
import type { EvaluableCourse, MyCampaignSummary, MySubmission, SelfAssessment, SubmissionInput, TeacherRankingRow, AdminTeacherReport, TeacherReport, TeacherReportInput, TeacherReportStatus } from "../types/evaluation";

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function listCriteria(): Promise<Criterion[]> {
  const { data } = await apiClient.get("/evaluations/criteria/");
  return unwrap<Criterion>(data);
}

export type CriterionInput = Pick<Criterion, "name" | "description" | "category" | "is_active">;

export async function createCriterion(input: CriterionInput): Promise<Criterion> {
  const { data } = await apiClient.post<Criterion>("/evaluations/criteria/", input);
  return data;
}

export async function updateCriterion(id: string, input: Partial<CriterionInput>): Promise<Criterion> {
  const { data } = await apiClient.patch<Criterion>(`/evaluations/criteria/${id}/`, input);
  return data;
}

export async function getClassificationConfig(): Promise<ClassificationConfig> {
  const { data } = await apiClient.get<ClassificationConfig>("/analytics/classification/config/");
  return data;
}

export async function updateClassificationConfig(input: Partial<ClassificationConfig>): Promise<ClassificationConfig> {
  const { data } = await apiClient.patch<ClassificationConfig>("/analytics/classification/config/", input);
  return data;
}

export async function getMyCourses(): Promise<EvaluableCourse[]> {
  const { data } = await apiClient.get<EvaluableCourse[]>("/evaluations/my-courses/");
  return data;
}

export async function getMyCampaigns(): Promise<MyCampaignSummary[]> {
  const { data } = await apiClient.get<MyCampaignSummary[]>("/evaluations/my-campaigns/");
  return data;
}

export async function submitEvaluation(input: SubmissionInput) {
  const { data } = await apiClient.post("/evaluations/submissions/", input);
  return data;
}

export async function listMySubmissions(): Promise<MySubmission[]> {
  const { data } = await apiClient.get("/evaluations/submissions/");
  return unwrap<MySubmission>(data);
}

export interface DraftInput {
  campaign_id: string;
  course_id: string;
  teacher_id: string;
  recommendation_score?: number;
  responses: { criteria_id: string; score: number; comment?: string }[];
}

export async function saveDraft(input: DraftInput): Promise<MySubmission> {
  const { data } = await apiClient.put<MySubmission>("/evaluations/drafts/", input);
  return data;
}

export async function getDraft(campaignId: string, courseId: string, teacherId: string): Promise<MySubmission | null> {
  try {
    const { data } = await apiClient.get<MySubmission>(`/evaluations/drafts/${campaignId}/${courseId}/`, {
      params: { teacher_id: teacherId },
    });
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function getTeacherRanking(scope: "mine" | "all"): Promise<TeacherRankingRow[]> {
  const { data } = await apiClient.get<TeacherRankingRow[]>("/evaluations/teacher-ranking/", { params: { scope } });
  return data;
}

export async function getSelfAssessment(): Promise<SelfAssessment | null> {
  try {
    const { data } = await apiClient.get<SelfAssessment>("/evaluations/self-assessment/");
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export async function saveSelfAssessment(responses: { criteria_id: string; score: number }[]): Promise<SelfAssessment> {
  const { data } = await apiClient.put<SelfAssessment>("/evaluations/self-assessment/", { responses });
  return data;
}

/** GET /evaluations/teacher-reports/ — the logged-in student's own free-text
 * reports (queryset scoped server-side to `student=user`). */
export async function listMyTeacherReports(): Promise<TeacherReport[]> {
  const { data } = await apiClient.get("/evaluations/teacher-reports/");
  return unwrap<TeacherReport>(data);
}

export async function createTeacherReport(input: TeacherReportInput): Promise<TeacherReport> {
  const { data } = await apiClient.post<TeacherReport>("/evaluations/teacher-reports/", input);
  return data;
}

/** Admin/directeur : tous les signalements, filtrables par statut. */
export async function listAdminTeacherReports(status?: TeacherReportStatus): Promise<AdminTeacherReport[]> {
  const { data } = await apiClient.get("/evaluations/teacher-reports/", { params: status ? { status } : {} });
  return unwrap<AdminTeacherReport>(data);
}

/** Admin/directeur : détail d'un signalement — le premier accès le passe de « nouveau » à « lu ». */
export async function getAdminTeacherReport(id: string): Promise<AdminTeacherReport> {
  const { data } = await apiClient.get<AdminTeacherReport>(`/evaluations/teacher-reports/${id}/`);
  return data;
}

export async function respondToTeacherReport(id: string, message: string): Promise<AdminTeacherReport> {
  const { data } = await apiClient.post<AdminTeacherReport>(`/evaluations/teacher-reports/${id}/respond/`, { message });
  return data;
}

export async function warnTeacherForReport(
  id: string,
  message: string
): Promise<AdminTeacherReport & { teacher_notified: boolean }> {
  const { data } = await apiClient.post(`/evaluations/teacher-reports/${id}/warn/`, { message });
  return data;
}
