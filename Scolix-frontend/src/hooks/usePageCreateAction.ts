import { useEffect } from "react";
import { usePageActionStore } from "../store/pageActionStore";

/** Registers this page's primary "+" action with the shell chrome (top toolbar + content header). */
export function usePageCreateAction(label: string, onClick: () => void, disabled = false, icon?: string) {
  const setAction = usePageActionStore((s) => s.setAction);
  useEffect(() => {
    setAction({ label, onClick, disabled, icon });
    return () => setAction(null);
  }, [label, onClick, disabled, icon, setAction]);
}
