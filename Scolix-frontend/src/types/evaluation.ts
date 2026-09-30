export interface EvaluableCourse {
  course_id: string;
  course_code: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  is_secondary_teacher: boolean;
  semester_id: string;
  semester_name: string;
  campaign_id: string;
  campaign_title: string;
  campaign_end_date: string;
  already_submitted: boolean;
  has_draft: boolean;
}

export interface MySubmission {
  id: string;
  campaign: string;
  campaign_title: string;
  course: string;
  course_name: string;
  course_code: string;
  teacher: string;
  teacher_name: string;
  status: string;
  global_score: string | null;
  recommendation_score: number;
  submitted_at: string | null;
  created_at: string;
  responses: { id: string; criteria: string; criteria_name: string; criteria_category: string; score: number; comment: string | null }[];
}

export interface MyCampaignSummary {
  campaign_id: string;
  campaign_title: string;
  semester_name: string;
  status: string;
  total_courses: number;
  submitted_courses: number;
}

export interface TeacherRankingRow {
  rank: number;
  teacher_id: string;
  teacher_name: string;
  department_name: string;
  avg_score: number;
  total_evaluations: number;
}

export interface SubmissionInput {
  campaign_id: string;
  course_id: string;
  teacher_id: string;
  recommendation_score: number;
  responses: { criteria_id: string; score: number; comment?: string }[];
}

export interface SelfAssessment {
  id: string;
  semester: string;
  semester_name: string;
  submitted_at: string;
  responses: { criteria: string; criteria_name: string; criteria_category: string; score: number }[];
}

export interface TeacherReport {
  id: string;
  student: string;
  student_name: string;
  student_email: string;
  teacher: string;
  teacher_name: string;
  department: string | null;
  department_name: string | null;
  title: string;
  description: string;
  status: TeacherReportStatus;
  admin_response: string | null;
  response_at: string | null;
  created_at: string;
}

export type TeacherReportStatus = "NEW" | "READ" | "TREATED";

export const TEACHER_REPORT_STATUS_LABEL: Record<TeacherReportStatus, string> = {
  NEW: "Nouveau",
  READ: "Lu",
  TREATED: "Traité",
};

export const TEACHER_REPORT_STATUS_TAG: Record<TeacherReportStatus, string> = {
  NEW: "tag-surv",
  READ: "tag-info",
  TREATED: "tag-accent",
};

/** Vue admin/directeur : inclut la mise en garde adressée à l'enseignant. */
export interface AdminTeacherReport extends TeacherReport {
  teacher_warning: string | null;
  warned_at: string | null;
}

export interface TeacherReportInput {
  teacher_id: string;
  title: string;
  description: string;
}
