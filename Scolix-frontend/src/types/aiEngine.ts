export interface TeacherBiasResult {
  teacher_id: string;
  teacher_name: string;
  criteria_id: string;
  criteria_name: string;
  avg_score: number;
  z_score: number;
  is_outlier: boolean;
  direction: "above" | "below" | string;
}

export interface EvaluatorBiasResult {
  student_id: string;
  student_name: string;
  student_code: string;
  avg_score_given: number;
  submissions_count: number;
  z_score: number;
  is_outlier: boolean;
  direction: "severe" | "above" | "below" | string;
}

export interface ClusterTeacher {
  teacher_id: string;
  teacher_name: string;
  score: number;
}

export interface Cluster {
  cluster_id: number;
  label: string;
  size: number;
  centroid: number[];
  avg_global_score: number;
  teachers: ClusterTeacher[];
}

export interface ClusteringResult {
  id: string;
  k: number;
  clusters: Cluster[];
  computed_at: string;
}

export interface CategoryTrend {
  category: string;
  slope: number;
}

export interface TeacherPrediction {
  id: string;
  teacher_id: string;
  predicted_score: number | null;
  slope: number | null;
  r_squared: number | null;
  data_points: number;
  status: "ok" | "insufficient_data";
  category_trends: CategoryTrend[];
  computed_at: string;
}

export interface TrainingCatalogItem {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: "INTERNAL" | "EXTERNAL";
  url: string | null;
}
