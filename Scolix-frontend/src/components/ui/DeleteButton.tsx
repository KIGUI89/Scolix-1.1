import { Icon } from "./Icon";

/** Corbeille — pictogramme unique pour toute action de suppression/retrait dans l'app. */
const TRASH_ICON_PATHS = [
  "M3 6h18",
  "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  "M10 11v6",
  "M14 11v6",
];

interface DeleteButtonProps {
  onClick: () => void;
  title?: string;
}

export function DeleteButton({ onClick, title = "Supprimer" }: DeleteButtonProps) {
  return (
    <button type="button" className="btn btn-ghost btn-icon" title={title} aria-label={title} onClick={onClick}>
      <Icon paths={TRASH_ICON_PATHS} />
    </button>
  );
}
