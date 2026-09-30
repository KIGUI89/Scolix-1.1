import { useState } from "react";
import { useSearchContentStore } from "../../store/searchContentStore";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";

/** Only rendered when a page has registered search content via useSearchContent — silent otherwise. */
export function SearchButton() {
  const [open, setOpen] = useState(false);
  const render = useSearchContentStore((s) => s.render);

  if (!render) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen((v) => !v)}
        title="Rechercher"
        aria-label="Rechercher"
      >
        <Icon path={CHROME_ICONS.search} size={15} />
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            zIndex: 30,
            width: 300,
            padding: 12,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          {render()}
        </div>
      )}
    </div>
  );
}
