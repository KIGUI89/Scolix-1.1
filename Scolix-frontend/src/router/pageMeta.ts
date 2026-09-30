export interface PageMeta {
  kicker: string;
  title: string;
  subtitle: string;
}

/**
 * Titles ported verbatim from the mockup's HEAD + TODO maps, keyed by nav id.
 * Kicker/subtitle text is intentionally left blank across every page (matching
 * the space freed up on the Dashboard) — only the title + its divider remain.
 */
export const PAGE_META: Record<string, PageMeta> = {
  admin: { kicker: "", title: "Tableau de bord", subtitle: "" },
  direction: { kicker: "", title: "Vue direction", subtitle: "" },
  teacher: { kicker: "", title: "Enseignants", subtitle: "" },
  teacherDetail: { kicker: "", title: "Fiche enseignant", subtitle: "" },
  eval: { kicker: "", title: "Formulaire d'évaluation étudiant", subtitle: "" },
  import: { kicker: "", title: "Import et intégration de données", subtitle: "" },
  campaigns: { kicker: "", title: "Campagnes et notifications", subtitle: "" },
  ml: { kicker: "", title: "Analyse et intelligence artificielle", subtitle: "" },
  criteria: { kicker: "", title: "Critères et pondérations", subtitle: "" },
  mobile: { kicker: "", title: "Vues mobiles", subtitle: "" },
  grades: { kicker: "", title: "Grades", subtitle: "" },
  semestres: { kicker: "", title: "Semestres académiques", subtitle: "" },
  etudiants: { kicker: "", title: "Étudiants", subtitle: "" },
  cours: { kicker: "", title: "Cours", subtitle: "" },
  enrollment: { kicker: "", title: "Inscriptions", subtitle: "" },
  utilisateurs: { kicker: "", title: "Gestion des utilisateurs", subtitle: "" },
  analytics: { kicker: "", title: "Analyse avancée", subtitle: "" },
  biais: { kicker: "", title: "Détection des anomalies et biais", subtitle: "" },
  classification: { kicker: "", title: "Classification des enseignants", subtitle: "" },
  alertes: { kicker: "", title: "Alertes", subtitle: "" },
  signalements: { kicker: "", title: "Signalements", subtitle: "" },
  stuHome: { kicker: "", title: "Accueil étudiant", subtitle: "" },
  stuTodo: { kicker: "", title: "Mes évaluations", subtitle: "" },
  stuReports: { kicker: "", title: "Rapport", subtitle: "" },
  stuRank: { kicker: "", title: "Classement des enseignants", subtitle: "" },
  teaHome: { kicker: "", title: "Mon tableau de bord", subtitle: "" },
  teaFiches: { kicker: "", title: "Fiches reçues", subtitle: "" },
  teaModules: { kicker: "", title: "Modules évalués", subtitle: "" },
  teaBilan: { kicker: "", title: "Bilan et suggestions", subtitle: "" },
};
