export type CampaignStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "CANCELLED";

export interface CampaignCriteriaLine {
  id: string;
  campaign: string;
  criteria: string;
  criteria_name: string;
  criteria_category: string;
  criteria_description: string;
  percentage: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  semester: string;
  semester_name: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  is_open: boolean;
  campaign_criteria: CampaignCriteriaLine[];
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  title: string;
  description: string;
  semester: string;
  start_date: string;
  end_date: string;
}

export interface CampaignTeacherStat {
  teacher_id: string;
  teacher_name: string;
  submissions_count: number;
  avg_score: number;
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  version: number;
}

export interface ClassificationConfig {
  exceptional_threshold: number;
  progression_threshold: number;
}
