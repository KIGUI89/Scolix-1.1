import { isAxiosError } from "axios";

/** Extracts a human-readable message from an API error, falling back to a generic one. */
export function extractErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  if (isAxiosError(err)) {
    if (!err.response) return "Impossible de contacter le serveur. Vérifiez votre connexion.";
    const data = err.response.data;
    if (typeof data?.detail === "string") return data.detail;
    for (const value of Object.values(data ?? {})) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}
