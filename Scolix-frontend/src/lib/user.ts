import type { Role, User } from "../types/auth";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  DIRECTOR: "Direction",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
};

/** Short form used in the sidebar's top row, next to the logo — matches the mockup. */
export const ROLE_SHORT_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  DIRECTOR: "Direction",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  DIRECTOR: "/dashboard",
  TEACHER: "/mon-tableau-de-bord",
  STUDENT: "/accueil",
};

export function displayName(user: User | null): string {
  if (!user) return "";
  return user.teacher_name || user.student_name || user.email;
}

export function initials(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
