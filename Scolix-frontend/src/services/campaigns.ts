import { apiClient } from "../lib/apiClient";
import type { Campaign, CampaignInput, CampaignTeacherStat, CampaignCriteriaLine } from "../types/campaign";

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get("/campaigns/");
  return unwrap<Campaign>(data);
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>("/campaigns/", input);
  return data;
}

export async function activateCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/activate/`);
  return data;
}

export async function closeCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/close/`);
  return data;
}

export async function cancelCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/cancel/`);
  return data;
}

export async function getCampaignTeachers(id: string): Promise<CampaignTeacherStat[]> {
  const { data } = await apiClient.get<CampaignTeacherStat[]>(`/campaigns/${id}/teachers/`);
  return data;
}

export async function getCampaignCriteria(id: string): Promise<CampaignCriteriaLine[]> {
  const { data } = await apiClient.get<CampaignCriteriaLine[]>(`/campaigns/${id}/criteria/`);
  return data;
}

export async function putCampaignCriteria(id: string, lines: { criteria: string; percentage: number }[]): Promise<CampaignCriteriaLine[]> {
  const { data } = await apiClient.put<CampaignCriteriaLine[]>(`/campaigns/${id}/criteria/`, lines);
  return data;
}
