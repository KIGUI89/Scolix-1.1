import { create } from "zustand";

interface PageAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: string;
}

interface PageIconAction {
  label: string;
  onClick: () => void;
  icon: string;
  disabled?: boolean;
}

interface PageActionState {
  action: PageAction | null;
  secondaryAction: PageIconAction | null;
  setAction: (action: PageAction | null) => void;
  setSecondaryAction: (action: PageIconAction | null) => void;
}

export const usePageActionStore = create<PageActionState>((set) => ({
  action: null,
  secondaryAction: null,
  setAction: (action) => set({ action }),
  setSecondaryAction: (secondaryAction) => set({ secondaryAction }),
}));
