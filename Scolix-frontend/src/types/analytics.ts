export interface KpiSet {
  total_submissions: number;
  avg_global_score: number | null;
  teachers_evaluated: number;
  total_teachers: number;
  participation_rate: number;
  students_completed: number;
  students_pending: number;
  nps: number | null;
  satisfaction_rate: number | null;
}

export interface ScoreTrend {
  semester_id: string;
  semester_name: string;
  academic_year: string;
  avg_score: number;
  eval_count: number;
}

export interface KpiResponse {
  kpis: KpiSet;
  score_trends: ScoreTrend[];
  criteria_breakdown: { criteria_id: string; criteria_name: string; criteria_category: string; avg_score: number; response_count: number }[];
  attendance_summary: { total: number; on_time: number; late: number; absent: number; punctuality_rate: number };
}

export interface RankingRow {
  rank: number;
  teacher_id: string;
  teacher_name: string;
  department: string;
  avg_score: number;
  eval_count: number;
  category: ClassificationCategory | null;
}

export interface HeatmapCell {
  department_id: string;
  department_name: string;
  department_code: string;
  avg_score: number;
  eval_count: number;
}

export interface AlertRow {
  teacher_id: string;
  teacher_name: string;
  current_avg: number;
  historical_avg: number;
  deviation_pct: number;
  direction: "up" | "down" | string;
}

export type ClassificationCategory = "EXCEPTIONAL" | "PROGRESSING" | "NEEDS_SUPPORT";

export interface ClassificationRow {
  teacher_id: string;
  teacher_name: string;
  department_name: string;
  avg_score: number;
  category: ClassificationCategory;
}

export interface PunctualityCorrelation {
  coefficient: number | null;
  sample_size: number;
  label: string;
  description: string;
}
