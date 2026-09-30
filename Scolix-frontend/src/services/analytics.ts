import { apiClient } from "../lib/apiClient";
import type {
  AlertRow,
  ClassificationRow,
  HeatmapCell,
  KpiResponse,
  PunctualityCorrelation,
  RankingRow,
  ScoreTrend,
} from "../types/analytics";

export async function getKpis(params: { semester_id?: string; department_id?: string } = {}): Promise<KpiResponse> {
  const { data } = await apiClient.get<KpiResponse>("/analytics/kpis/", { params });
  return data;
}

export async function getRanking(params: { semester_id?: string; department_id?: string; top_n?: number } = {}): Promise<RankingRow[]> {
  const { data } = await apiClient.get<RankingRow[]>("/analytics/ranking/", { params });
  return data;
}

export async function getTrends(): Promise<ScoreTrend[]> {
  const { data } = await apiClient.get<ScoreTrend[]>("/analytics/trends/");
  return data;
}

export async function getHeatmap(semesterId?: string): Promise<HeatmapCell[]> {
  const { data } = await apiClient.get<HeatmapCell[]>("/analytics/heatmap/", {
    params: semesterId ? { semester_id: semesterId } : {},
  });
  return data;
}

export async function getAlerts(semesterId?: string): Promise<AlertRow[]> {
  const { data } = await apiClient.get<AlertRow[]>("/analytics/alerts/", {
    params: semesterId ? { semester_id: semesterId } : {},
  });
  return data;
}

export async function getClassification(params: { semester_id?: string; department_id?: string } = {}): Promise<ClassificationRow[]> {
  const { data } = await apiClient.get<ClassificationRow[]>("/analytics/classification/", { params });
  return data;
}

export async function getPunctualityCorrelation(semesterId?: string): Promise<PunctualityCorrelation> {
  const { data } = await apiClient.get<PunctualityCorrelation>("/analytics/punctuality-correlation/", {
    params: semesterId ? { semester_id: semesterId } : {},
  });
  return data;
}
