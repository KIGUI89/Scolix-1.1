import { apiClient } from "../lib/apiClient";
import type { Role } from "../types/auth";
import type { PlatformAccount, PlatformAccountInput } from "../types/account";

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function listAccounts(role?: Role): Promise<PlatformAccount[]> {
  const { data } = await apiClient.get("/auth/users/", { params: role ? { role } : {} });
  return unwrap<PlatformAccount>(data);
}

export async function createAccount(input: PlatformAccountInput): Promise<PlatformAccount> {
  const { data } = await apiClient.post<PlatformAccount>("/auth/users/", input);
  return data;
}

export async function updateAccount(id: string, input: Partial<PlatformAccountInput>): Promise<PlatformAccount> {
  const { data } = await apiClient.patch<PlatformAccount>(`/auth/users/${id}/`, input);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.delete(`/auth/users/${id}/`);
}
