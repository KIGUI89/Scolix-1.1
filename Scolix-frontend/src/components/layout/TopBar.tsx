import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import iconLight from "../../assets/brand/scolix-icon-light.png";
import wordmarkLight from "../../assets/brand/scolix-wordmark-light.png";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { NotificationsBell } from "./NotificationsBell";
import { useThemeStore } from "../../store/themeStore";
import { useUiStore } from "../../store/uiStore";
import { useNavHistoryStore } from "../../store/navHistoryStore";
import { usePageChromeStore } from "../../store/pageChromeStore";
import { metaForPath } from "../../router/routeMeta";
import { useBreadcrumbStore } from "../../store/breadcrumbStore";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const navMode = useUiStore((s) => s.navMode);
  const setNavMode = useUiStore((s) => s.setNavMode);
  const { stack, index, goBack: goBackInHistory, goForward: goForwardInHistory, goToIndex } = useNavHistoryStore();
  const compact = usePageChromeStore((s) => s.compact);
  const crumbs = useBreadcrumbStore((s) => s.crumbs);
  const [histOpen, setHistOpen] = useState(false);

  const logoFilter = theme === "dark" ? "invert(1)" : "none";
  const noBack = index <= 0;
  const noFwd = index >= stack.length - 1;

  function goBack() {
    const path = goBackInHistory();
    if (path) navigate(path);
  }
  function goFwd() {
    const path = goForwardInHistory();
    if (path) navigate(path);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", background: "var(--color-neutral-100)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative", left: 130, flexGrow: 0 }}>
        <button type="button" className="btn btn-ghost btn-icon" onClick={goBack} disabled={noBack} title="Retour" aria-label="Retour">
          <Icon path={CHROME_ICONS.back} size={16} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" onClick={goFwd} disabled={noFwd} title="Suivant" aria-label="Suivant">
          <Icon path={CHROME_ICONS.forward} size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setHistOpen((v) => !v)}
          title="Historique"
          aria-label="Historique"
          style={{ width: 28, height: 26 }}
        >
          <Icon path={CHROME_ICONS.history} size={15} />
        </button>
        {histOpen && (
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 0,
              zIndex: 30,
              minWidth: 220,
              padding: 6,
              background: "var(--color-bg)",
              border: "1px solid var(--color-divider)",
              borderRadius: 10,
              boxShadow: "var(--shadow-panel)",
            }}
          >
            <div className="text-muted" style={{ fontSize: 12, padding: "4px 10px 6px" }}>
              Pages visitées
            </div>
            {stack.map((path, i) => (
              <a
                key={`${path}-${i}`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setHistOpen(false);
                  const target = goToIndex(i);
                  if (target) navigate(target);
                }}
                style={{
                  display: "block",
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "var(--color-text)",
                  background: i === index ? "var(--color-neutral-200)" : "transparent",
                }}
              >
                {metaForPath(path).title || path}
              </a>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto" }}>
        <img src={iconLight} alt="" style={{ height: 16, width: "auto", filter: logoFilter }} />
        <img src={wordmarkLight} alt="Scolix" style={{ height: 13, width: "auto", filter: logoFilter }} />
        {(crumbs ?? [{ label: title }]).map((c, i, all) => (
          <Fragment key={`${c.label}-${i}`}>
            <span className="text-muted" style={{ fontSize: 13 }}>
              ›
            </span>
            {c.onClick && i < all.length - 1 ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: "2px 4px", height: "auto" }}
                onClick={c.onClick}
              >
                {c.label}
              </button>
            ) : (
              <span style={{ fontSize: 13, fontWeight: all.length > 1 ? 600 : 400 }}>{c.label}</span>
            )}
          </Fragment>
        ))}
      </div>

      <div className="seg" style={{ background: "var(--color-neutral-300)" }}>
        <label className={`seg-opt ${navMode === "side" ? "active" : ""}`}>
          <input type="radio" name="navmode" checked={navMode === "side"} onChange={() => setNavMode("side")} style={{ display: "none" }} />
          Latéral
        </label>
        <label className={`seg-opt ${navMode === "top" ? "active" : ""}`}>
          <input type="radio" name="navmode" checked={navMode === "top"} onChange={() => setNavMode("top")} style={{ display: "none" }} />
          Horizontal
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <ThemeToggleButton />
        {!compact && <NotificationsBell />}
      </div>
    </div>
  );
}
