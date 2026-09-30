import { Icon } from "./Icon";

/** Feuille de papier avec un stylo — pictogramme unique pour toute action de modification dans l'app. */
const EDIT_ICON_PATHS = [
  "M13 4H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-8",
  "M17.5 3.5a2.12 2.12 0 013 3L11 16l-4 1 1-4z",
];

interface EditButtonProps {
  onClick: () => void;
  title?: string;
}

export function EditButton({ onClick, title = "Modifier" }: EditButtonProps) {
  return (
    <button type="button" className="btn btn-ghost btn-icon" title={title} aria-label={title} onClick={onClick}>
      <Icon paths={EDIT_ICON_PATHS} />
    </button>
  );
}
