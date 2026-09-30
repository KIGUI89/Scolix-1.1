import type { Semester } from "../types/sync";

/**
 * Picks the "current" semester for a default filter selection: the one
 * flagged active (kept in sync with today's date by the backend), or — when
 * we're between two semesters, as can genuinely happen — the most recently
 * ended one, so the dashboard defaults to the latest real data instead of an
 * empty period.
 */
export function getDefaultSemester(semesters: Semester[]): Semester | undefined {
  const active = semesters.find((s) => s.is_active);
  if (active) return active;

  const today = new Date().toISOString().slice(0, 10);
  const past = semesters
    .filter((s) => s.end_date < today)
    .sort((a, b) => b.end_date.localeCompare(a.end_date));
  return past[0];
}
