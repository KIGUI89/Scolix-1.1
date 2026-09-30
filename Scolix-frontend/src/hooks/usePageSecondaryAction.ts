import { useEffect } from "react";
import { usePageActionStore } from "../store/pageActionStore";

/** Registers a secondary icon-only action with the shell chrome, shown just left of the primary "+" button. */
export function usePageSecondaryAction(label: string, onClick: () => void, icon: string, disabled = false) {
  const setSecondaryAction = usePageActionStore((s) => s.setSecondaryAction);
  useEffect(() => {
    setSecondaryAction({ label, onClick, icon, disabled });
    return () => setSecondaryAction(null);
  }, [label, onClick, icon, disabled, setSecondaryAction]);
}
