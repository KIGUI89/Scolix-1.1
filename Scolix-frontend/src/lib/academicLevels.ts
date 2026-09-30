/** Niveaux académiques (système LMD) — liste unique partagée par les formulaires
 * Étudiant, Enseignant (assignation de matières) et Cours (création), pour que
 * les mêmes codes ("L1", "M2"…) soient utilisés partout en base. */
export const ACADEMIC_LEVELS = [
  { code: "L1", label: "Licence 1" },
  { code: "L2", label: "Licence 2" },
  { code: "L3", label: "Licence 3" },
  { code: "M1", label: "Master 1" },
  { code: "M2", label: "Master 2" },
] as const;

export type AcademicLevelCode = (typeof ACADEMIC_LEVELS)[number]["code"];

export function levelLabel(code: string): string {
  return ACADEMIC_LEVELS.find((l) => l.code === code)?.label ?? code;
}
