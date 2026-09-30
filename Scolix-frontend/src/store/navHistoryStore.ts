import { create } from "zustand";

interface NavHistoryState {
  stack: string[];
  index: number;
  push: (path: string) => void;
  goBack: () => string | null;
  goForward: () => string | null;
  goToIndex: (i: number) => string | null;
}

/** Tracks visited routes for the shell's back/forward arrows and "Historique" popover. */
export const useNavHistoryStore = create<NavHistoryState>((set, get) => ({
  stack: [],
  index: -1,
  push: (path) => {
    const { stack, index } = get();
    if (stack[index] === path) return;
    const nextStack = stack.slice(0, index + 1).concat(path);
    set({ stack: nextStack, index: nextStack.length - 1 });
  },
  // goBack/goForward/goToIndex move `index` to point at the target entry
  // *before* the caller navigates there. That way, when the route change
  // reaches AppShell's push(path) afterwards, stack[index] already equals
  // path and push() no-ops instead of appending a duplicate — which is what
  // previously made the arrows unusable (each "back" re-pushed the same
  // page instead of walking the stack, so "forward" never had anywhere to go).
  goBack: () => {
    const { stack, index } = get();
    if (index <= 0) return null;
    const nextIndex = index - 1;
    set({ index: nextIndex });
    return stack[nextIndex];
  },
  goForward: () => {
    const { stack, index } = get();
    if (index >= stack.length - 1) return null;
    const nextIndex = index + 1;
    set({ index: nextIndex });
    return stack[nextIndex];
  },
  goToIndex: (i) => {
    const { stack } = get();
    if (i < 0 || i >= stack.length) return null;
    set({ index: i });
    return stack[i];
  },
}));
