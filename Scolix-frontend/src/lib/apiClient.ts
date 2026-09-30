import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) throw new Error("no-refresh-token");
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/auth/refresh/`,
    { refresh },
  );
  useAuthStore.getState().setAccessToken(data.access);
  return data.access as string;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const access = await refreshPromise;
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
