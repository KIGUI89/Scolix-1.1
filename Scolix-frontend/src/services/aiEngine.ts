import { apiClient } from "../lib/apiClient";
import type { TeacherRecommendations } from "../types/teacher";
import type {
  ClusteringResult,
  EvaluatorBiasResult,
  TeacherBiasResult,
  TeacherPrediction,
  TrainingCatalogItem,
} from "../types/aiEngine";

export async function getTeacherRecommendations(teacherId: string): Promise<TeacherRecommendations> {
  const { data } = await apiClient.get<TeacherRecommendations>(`/ai/recommendations/${teacherId}/`);
  return data;
}

export async function getClustering(): Promise<ClusteringResult | null> {
  try {
    const { data } = await apiClient.get<ClusteringResult>("/ai/clustering/");
    return data;
  } catch {
    return null;
  }
}

export async function retrainClustering(k = 4): Promise<ClusteringResult> {
  const { data } = await apiClient.post<ClusteringResult>("/ai/clustering/", { k });
  return data;
}

export async function computeTeacherBias(semesterId?: string): Promise<TeacherBiasResult[]> {
  const { data } = await apiClient.post<{ results: TeacherBiasResult[] }>("/ai/bias/", semesterId ? { semester_id: semesterId } : {});
  return data.results;
}

// Read-only, per-teacher lookup — unlike computeTeacherBias (POST), this never
// stores a new BiasDetectionResult, so it's safe to call on every profile visit.
export async function getTeacherBias(teacherId: string, semesterId?: string): Promise<TeacherBiasResult[]> {
  const { data } = await apiClient.get<{ results: TeacherBiasResult[] }>("/ai/bias/", {
    params: { teacher_id: teacherId, ...(semesterId ? { semester_id: semesterId } : {}) },
  });
  return data.results;
}

export async function computeEvaluatorBias(semesterId?: string): Promise<EvaluatorBiasResult[]> {
  const { data } = await apiClient.post<{ results: EvaluatorBiasResult[] }>(
    "/ai/evaluator-bias/",
    semesterId ? { semester_id: semesterId } : {},
  );
  return data.results;
}

export async function getEvaluatorBiasConfig(): Promise<{ normalization_enabled: boolean }> {
  const { data } = await apiClient.get("/ai/evaluator-bias/config/");
  return data;
}

export async function setEvaluatorBiasNormalization(enabled: boolean): Promise<{ normalization_enabled: boolean }> {
  const { data } = await apiClient.patch("/ai/evaluator-bias/config/", { normalization_enabled: enabled });
  return data;
}

export async function getTeacherPrediction(teacherId: string): Promise<TeacherPrediction> {
  const { data } = await apiClient.get<TeacherPrediction>(`/ai/predictions/${teacherId}/`);
  return data;
}

export async function retrainTeacherPrediction(teacherId: string): Promise<TeacherPrediction> {
  const { data } = await apiClient.post<TeacherPrediction>(`/ai/predictions/${teacherId}/retrain/`);
  return data;
}

export async function getTrainingCatalog(): Promise<TrainingCatalogItem[]> {
  const { data } = await apiClient.get<TrainingCatalogItem[]>("/ai/training-catalog/");
  return data;
}
