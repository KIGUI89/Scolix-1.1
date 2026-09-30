import type { Role } from "../types/auth";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  /** Roles allowed to see this item. Undefined = ADMIN/DIRECTOR only (default admin console scope). */
  roles?: Role[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** SVG path data ported verbatim from the mockup's ICONS map, keyed by nav id. */
export const NAV_ICONS: Record<string, string> = {
  admin: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  teacher: "M4 20c0-3 2.7-5 6-5s6 2 6 5M10 5a3 3 0 100 6 3 3 0 000-6",
  grades: "M12 4a4 4 0 100 8 4 4 0 000-8M9 13l-1 7 4-2 4 2-1-7",
  direction: "M5 21V5h9v16M9 21v-4M14 10h5v11M8 8h2M8 12h2",
  semestres: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  etudiants: "M3 9l9-4 9 4-9 4-9-4M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4",
  cours: "M4 5h7v14H4zM13 5h7v14h-7",
  enrollment: "M3 20c0-3 2.7-5 6-5s6 2 6 5M9 5a3 3 0 100 6 3 3 0 000-6M19 8v6M16 11h6",
  campaigns: "M4 11l12-5v10L4 13zM4 11v3M17 9a3 3 0 010 5",
  criteria: "M4 7l2 2 3-3M4 16l2 2 3-3M13 8h7M13 17h7",
  utilisateurs:
    "M3 20c0-3 2.7-5 6-5s6 2 6 5M9 5a3 3 0 100 6 3 3 0 000-6M18 12a2 2 0 100 4 2 2 0 000-4",
  analytics: "M5 20V11M11 20V4M17 20v-6M3 20h18",
  ml: "M6 6a2 2 0 100 4 2 2 0 000-4M18 6a2 2 0 100 4 2 2 0 000-4M12 15a2 2 0 100 4 2 2 0 000-4M7.6 9.6l3.4 4.2M16.4 9.6L13 13.8M8 8h8",
  biais: "M3 12h4l2 6 4-14 2 8h6",
  classification:
    "M12 4a8 8 0 100 16 8 8 0 000-16M12 8a4 4 0 100 8 4 4 0 000-8M12 11.2a.8.8 0 100 1.6.8.8 0 000-1.6",
  alertes: "M12 4l9 16H3zM12 10v4M12 17h.01",
  signalements: "M5 21V4M5 4h11l-2 4 2 4H5",
  import: "M12 16V4M8 8l4-4 4 4M4 18v2h16v-2",
  eval: "M9 4h6v3H9zM6 6h12v14H6zM9 12h6M9 16h6",
  mobile: "M8 3h8v18H8zM11 18h2",
  direction2: "M5 21V5h9v16M9 21v-4M14 10h5v11M8 8h2M8 12h2",
  stuHome: "M4 11l8-6 8 6v9H4zM10 20v-6h4v6",
  stuTodo: "M8 4h8v3H8zM6 6h12v14H6zM9 12l2 2 4-4",
  stuRank: "M6 20V12M12 20V6M18 20v-5M3 20h18",
  stuReports: "M5 4h9l4 4v12H5zM14 4v4h4M9 13h6M9 17h4",
  teaHome: "M4 13a8 8 0 1116 0M12 13l4-4M4 13h2M18 13h2",
  teaFiches: "M5 4h9l4 4v12H5zM14 4v4h4M9 13h6M9 17h4",
  teaModules: "M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z",
  teaBilan: "M4 18l4-6 4 3 4-8 4 5M4 21h16",
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Navigation",
    items: [
      { id: "admin", label: "Dashboard", path: "/dashboard", icon: NAV_ICONS.admin, roles: ["ADMIN", "DIRECTOR"] },
      { id: "teacher", label: "Enseignants", path: "/enseignants", icon: NAV_ICONS.teacher },
      { id: "grades", label: "Grades", path: "/grades", icon: NAV_ICONS.grades },
      { id: "direction", label: "Départements", path: "/departements", icon: NAV_ICONS.direction },
      { id: "semestres", label: "Semestres", path: "/semestres", icon: NAV_ICONS.semestres },
      { id: "etudiants", label: "Étudiants", path: "/etudiants", icon: NAV_ICONS.etudiants },
      { id: "cours", label: "Cours", path: "/cours", icon: NAV_ICONS.cours },
      { id: "enrollment", label: "Enrollment", path: "/enrollment", icon: NAV_ICONS.enrollment },
      { id: "campaigns", label: "Campagnes", path: "/campagnes", icon: NAV_ICONS.campaigns },
      { id: "criteria", label: "Critères", path: "/criteres", icon: NAV_ICONS.criteria },
      { id: "utilisateurs", label: "Utilisateurs", path: "/utilisateurs", icon: NAV_ICONS.utilisateurs },
      { id: "analytics", label: "Analytics", path: "/analytics", icon: NAV_ICONS.analytics },
      { id: "ml", label: "IA & Clusters", path: "/ia-clusters", icon: NAV_ICONS.ml },
      { id: "biais", label: "Biais détectés", path: "/biais", icon: NAV_ICONS.biais },
      { id: "classification", label: "Classification", path: "/classification", icon: NAV_ICONS.classification },
      { id: "alertes", label: "Alertes", path: "/alertes", icon: NAV_ICONS.alertes },
      { id: "signalements", label: "Signalements", path: "/signalements", icon: NAV_ICONS.signalements },
      { id: "import", label: "Import de données", path: "/import", icon: NAV_ICONS.import },
      { id: "stuHome", label: "Accueil étudiant", path: "/accueil", icon: NAV_ICONS.stuHome, roles: ["STUDENT"] },
      { id: "stuTodo", label: "Mes évaluations", path: "/mes-evaluations", icon: NAV_ICONS.stuTodo, roles: ["STUDENT"] },
      { id: "stuReports", label: "Rapport", path: "/mes-rapports", icon: NAV_ICONS.stuReports, roles: ["STUDENT"] },
      { id: "stuRank", label: "Classement profs", path: "/classement", icon: NAV_ICONS.stuRank, roles: ["STUDENT"] },
      { id: "teaHome", label: "Mon tableau de bord", path: "/mon-tableau-de-bord", icon: NAV_ICONS.teaHome, roles: ["TEACHER"] },
      { id: "teaFiches", label: "Fiches reçues", path: "/fiches-recues", icon: NAV_ICONS.teaFiches, roles: ["TEACHER"] },
      { id: "teaModules", label: "Modules évalués", path: "/modules-evalues", icon: NAV_ICONS.teaModules, roles: ["TEACHER"] },
      { id: "teaBilan", label: "Bilan & suggestions", path: "/bilan-suggestions", icon: NAV_ICONS.teaBilan, roles: ["TEACHER"] },
    ],
  },
];

export function navForRole(role: Role | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => (it.roles ? it.roles.includes(role) : role === "ADMIN" || role === "DIRECTOR")),
  })).filter((g) => g.items.length > 0);
}
