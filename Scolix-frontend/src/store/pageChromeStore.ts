import { useEffect } from "react";
import { create } from "zustand";

interface PageChrome {
  /** Single-row header (no Filtre/Affichage row) + shows the Affichage filter next to the bell. */
  compact: boolean;
  /** Hides the "+" entirely (both the content header's and the top toolbar's) — for consultation-only pages. */
  hideCreate: boolean;
}

interface PageChromeState extends PageChrome {
  setChrome: (chrome: Partial<PageChrome>) => void;
}

const DEFAULT_CHROME: PageChrome = { compact: false, hideCreate: false };

export const usePageChromeStore = create<PageChromeState>((set) => ({
  ...DEFAULT_CHROME,
  setChrome: (chrome) => set({ ...DEFAULT_CHROME, ...chrome }),
}));

/** Registers this page's chrome layout with the shell; resets to defaults on unmount. */
export function usePageChrome(chrome: Partial<PageChrome>) {
  const setChrome = usePageChromeStore((s) => s.setChrome);
  const { compact, hideCreate } = chrome;
  useEffect(() => {
    setChrome({ compact, hideCreate });
    return () => setChrome({});
  }, [compact, hideCreate, setChrome]);
}
