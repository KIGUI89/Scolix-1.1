import { useEffect } from "react";
import type { ReactNode } from "react";
import { create } from "zustand";

type Render = (() => ReactNode) | null;

interface AffichageContentState {
  render: Render;
  setRender: (render: Render) => void;
}

/** Lets a page replace the shared "Affichage" popover's default (année/semestre) body with its own content. */
export const useAffichageContentStore = create<AffichageContentState>((set) => ({
  render: null,
  setRender: (render) => set({ render }),
}));

/** Registers this page's custom Affichage popover content; restores the default on unmount. */
export function useAffichageContent(render: () => ReactNode) {
  const setRender = useAffichageContentStore((s) => s.setRender);
  useEffect(() => {
    setRender(render);
    return () => setRender(null);
  });
}
