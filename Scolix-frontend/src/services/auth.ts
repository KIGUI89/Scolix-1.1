import { apiClient } from "../lib/apiClient";
import type { LoginResponse, User } from "../types/auth";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login/", { email, password });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me/");
  return data;
}
