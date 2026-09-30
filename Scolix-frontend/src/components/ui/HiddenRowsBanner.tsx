interface HiddenRowsBannerProps {
  count: number;
  show: boolean;
  onToggle: () => void;
}

/** Small escape hatch next to lists that use useHiddenRows, so a row hidden via the trash icon
 * can still be found and restored — nothing is ever actually deleted. */
export function HiddenRowsBanner({ count, show, onToggle }: HiddenRowsBannerProps) {
  if (count === 0) return null;
  return (
    <button type="button" className="btn btn-ghost" style={{ fontSize: 12, alignSelf: "flex-start" }} onClick={onToggle}>
      {show ? "Masquer" : "Afficher"} les éléments retirés de l'affichage ({count})
    </button>
  );
}
