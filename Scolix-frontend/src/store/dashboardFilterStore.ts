import { create } from "zustand";

interface DashboardFilterState {
  semesterId: string;
  setSemesterId: (id: string) => void;
}

/** The "Affichage" (année/semestre) filter shared by the admin dashboard's panels. */
export const useDashboardFilterStore = create<DashboardFilterState>((set) => ({
  semesterId: "",
  setSemesterId: (semesterId) => set({ semesterId }),
}));
