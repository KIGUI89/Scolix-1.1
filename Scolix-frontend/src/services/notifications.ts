import { apiClient } from "../lib/apiClient";

export interface Notification {
  id: string;
  notif_type: string;
  channel: string;
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  title: string;
  message: string;
  related_resource: string | null;
  related_resource_id: string | null;
  sent_at: string | null;
  read_at: string | null;
}

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get("/notifications/");
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function markRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/mark_read/`);
}

export async function markAllRead(): Promise<void> {
  await apiClient.post("/notifications/mark_all_read/");
}
