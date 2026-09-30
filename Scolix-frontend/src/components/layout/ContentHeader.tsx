import iconLight from "../../assets/brand/scolix-icon-light.png";
import { NotificationsBell } from "./NotificationsBell";
import { SearchButton } from "./SearchButton";
import { AffichageFilterButton } from "./AffichageFilterButton";
import { Icon } from "../ui/Icon";
import { useThemeStore } from "../../store/themeStore";
import { usePageActionStore } from "../../store/pageActionStore";
import { usePageChromeStore } from "../../store/pageChromeStore";
import { useAuthStore } from "../../store/authStore";

interface ContentHeaderProps {
  title: string;
}

export function ContentHeader({ title }: ContentHeaderProps) {
  const theme = useThemeStore((s) => s.theme);
  const action = usePageActionStore((s) => s.action);
  const secondaryAction = usePageActionStore((s) => s.secondaryAction);
  const { compact, hideCreate } = usePageChromeStore();
  // Espace enseignant : ni bouton « Affichage » ni bouton « + », sur toutes ses pages.
  const isTeacher = useAuthStore((s) => s.user?.role === "TEACHER");
  const logoFilter = theme === "dark" ? "invert(1)" : "none";

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 4, background: "var(--color-bg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 16px",
          borderBottom: "1px solid var(--color-divider)",
          minHeight: 40,
        }}
      >
        <img src={iconLight} alt="" style={{ height: 16, width: "auto", filter: logoFilter }} />
        <span className="text-muted" style={{ fontSize: 13 }}>
          ›
        </span>
        <span style={{ fontSize: 13 }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          {/* Sur les autres pages, la cloche vit dans le bandeau global (TopBar) —
              gardée ici uniquement pour le Dashboard, inchangé. La recherche et
              "Affichage" restent ici partout, juste avant ce second bouton "+". */}
          {compact && <NotificationsBell />}
          <SearchButton />
          {!isTeacher && <AffichageFilterButton />}
          {secondaryAction && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title={secondaryAction.label}
              aria-label={secondaryAction.label}
              disabled={secondaryAction.disabled}
              onClick={() => secondaryAction.onClick()}
            >
              <Icon path={secondaryAction.icon} size={15} />
            </button>
          )}
          {!hideCreate && !isTeacher && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title={action?.label ?? "Créer"}
              aria-label={action?.label ?? "Créer"}
              disabled={!action || action.disabled}
              onClick={() => action?.onClick()}
            >
              {action?.icon ? <Icon path={action.icon} size={15} /> : "+"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
