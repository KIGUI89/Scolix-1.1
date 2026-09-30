import { useCallback, useState } from "react";

function load(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persist(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Private browsing, storage full, etc. — the hide still works for this session.
  }
}

/**
 * Soft "remove from dashboard" for lists whose records must never be deleted from the database.
 * Hides rows locally (per browser, persisted in localStorage) instead of calling any destructive
 * backend endpoint — the underlying record is left untouched.
 */
export function useHiddenRows(storageKey: string) {
  const [hidden, setHidden] = useState<Set<string>>(() => load(storageKey));

  const hide = useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const restore = useCallback(
    (id: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persist(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return { hidden, hide, restore, isHidden };
}
