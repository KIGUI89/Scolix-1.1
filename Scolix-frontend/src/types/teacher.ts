import type { ClassificationCategory } from "./analytics";

export interface Teacher {
  id: string;
  university_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  department_name: string;
  grade: string | null;
  grade_name: string | null;
  specialty: string;
  is_active: boolean;
}

export type TeacherInput = Pick<
  Teacher,
  "first_name" | "last_name" | "email" | "phone" | "department" | "grade" | "specialty" | "is_active"
> & { university_id: string; matricule: string };

export interface CriteriaScore {
  criteria_id: string;
  criteria_name: string;
  category: string;
  avg_score: number;
  count: number;
}

export interface SemesterHistoryPoint {
  semester_id: string;
  semester_name: string;
  academic_year: string;
  avg_score: number;
  count: number;
}

export interface TeacherScores {
  teacher_id: string;
  teacher_name: string;
  total_evaluations: number;
  global_average: number | null;
  category: ClassificationCategory | null;
  criteria_scores: CriteriaScore[];
  semester_history: SemesterHistoryPoint[];
}

export interface TeacherComment {
  comment_id: string;
  criteria_name: string;
  category: string;
  score: number;
  comment: string;
  semester_name: string;
  submitted_at: string;
}

export interface TeacherComments {
  teacher_id: string;
  teacher_name: string;
  total_comments: number;
  comments: TeacherComment[];
}

export interface TrainingCatalogEntry {
  id: string;
  title: string;
  provider: string;
  url: string;
}

export interface CriteriaRecommendation {
  criteria_id: string;
  criteria_name: string;
  category: string;
  avg_score: number;
  score_pct: number;
  recommendation: string;
  trainings: TrainingCatalogEntry[];
}

export interface TeacherRecommendations {
  teacher_id: string | null;
  global_avg: number | null;
  recommendations: CriteriaRecommendation[];
  needs_improvement: boolean;
}

export interface TeacherDashboardCriteriaAverage {
  criteria__id: string;
  criteria__name: string;
  criteria__category: string;
  average_score: number;
  total_responses: number;
}

export interface TeacherDashboardCourse {
  course__id: string;
  course__code: string;
  course__name: string;
  total_evaluations: number;
  average_score: number;
  enrolled_count: number;
  score_delta: number | null;
}

export interface TeacherDashboardComment {
  criteria_name?: string;
  comment: string;
  semester_name?: string;
  submitted_at?: string;
}

export interface TeacherDashboard {
  teacher_name: string;
  teacher_email: string;
  total_evaluations: number;
  global_average: string | number;
  criteria_averages: TeacherDashboardCriteriaAverage[];
  evaluated_courses: TeacherDashboardCourse[];
  recent_comments: TeacherDashboardComment[];
  total_enrolled: number;
}
