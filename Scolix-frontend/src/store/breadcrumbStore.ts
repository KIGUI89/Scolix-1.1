import { useEffect } from "react";
import { create } from "zustand";

export interface Crumb {
  label: string;
  /** Absent sur le dernier segment (page courante). */
  onClick?: () => void;
}

interface BreadcrumbState {
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
}

/** Chemin de navigation affiché dans le bandeau du haut, à côté du logo. Null = titre de la page seul. */
export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  crumbs: null,
  setCrumbs: (crumbs) => set({ crumbs }),
}));

/** Enregistre le chemin de navigation de la page courante ; le retire au démontage. */
export function useBreadcrumb(crumbs: Crumb[] | null) {
  const setCrumbs = useBreadcrumbStore((s) => s.setCrumbs);
  const key = crumbs?.map((c) => c.label).join("\u0000") ?? "";
  useEffect(() => {
    setCrumbs(crumbs);
    // Les callbacks changent à chaque rendu : seuls les libellés déclenchent la mise à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);
}
