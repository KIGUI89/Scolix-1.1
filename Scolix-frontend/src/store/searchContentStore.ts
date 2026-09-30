import { useEffect } from "react";
import type { ReactNode } from "react";
import { create } from "zustand";

type Render = (() => ReactNode) | null;

interface SearchContentState {
  render: Render;
  setRender: (render: Render) => void;
}

/**
 * Lets a page register search content for the shared search button in the
 * content header. Unlike Affichage (always shown), the button itself only
 * renders when a page has registered something here.
 */
export const useSearchContentStore = create<SearchContentState>((set) => ({
  render: null,
  setRender: (render) => set({ render }),
}));

/** Registers this page's search field (null = no search on this step); unregisters it on unmount. */
export function useSearchContent(render: (() => ReactNode) | null) {
  const setRender = useSearchContentStore((s) => s.setRender);
  useEffect(() => {
    setRender(render);
    return () => setRender(null);
  });
}
