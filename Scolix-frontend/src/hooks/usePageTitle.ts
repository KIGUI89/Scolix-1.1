import { useEffect } from "react";
import { usePageTitleStore } from "../store/pageTitleStore";

/** Overrides the shell's page title (top bar + content header + page header) for the current page, e.g. a personalized greeting. */
export function usePageTitle(title: string | null) {
  const setTitle = usePageTitleStore((s) => s.setTitle);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
