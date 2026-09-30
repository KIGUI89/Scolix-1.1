import { NavLink, useLocation, useNavigate } from "react-router-dom";
import iconLight from "../../assets/brand/scolix-icon-light.png";
import wordmarkLight from "../../assets/brand/scolix-wordmark-light.png";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { useNavHistoryStore } from "../../store/navHistoryStore";
import { navForRole } from "../../router/nav";
import { displayName, initials } from "../../lib/user";

const TOP_ITEM_COUNT = 7;

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const { stack, index, goBack: goBackInHistory, goForward: goForwardInHistory } = useNavHistoryStore();
  const logoFilter = theme === "dark" ? "invert(1)" : "none";
  const name = displayName(user);

  const items = navForRole(user?.role).flatMap((g) => g.items);
  const topItems = items.slice(0, TOP_ITEM_COUNT);
  const moreItems = items.slice(TOP_ITEM_COUNT);
  const activeMoreId = moreItems.find((it) => it.path === location.pathname)?.id ?? "";

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
    <header
      style={{
        borderBottom: "1px solid var(--color-divider)",
        background: "var(--color-bg)",
        position: "sticky",
        top: 14,
        zIndex: 5,
        margin: "14px 14px 0",
        borderRadius: 14,
        boxShadow: "var(--shadow-panel)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 16px" }}>
        <img src={iconLight} alt="" style={{ height: 17, width: "auto", filter: logoFilter }} />
        <img src={wordmarkLight} alt="Scolix" style={{ height: 15, width: "auto", filter: logoFilter }} />

        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={goBack} disabled={noBack} title="Retour" aria-label="Retour">
            <Icon path={CHROME_ICONS.back} size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={goFwd} disabled={noFwd} title="Suivant" aria-label="Suivant">
            <Icon path={CHROME_ICONS.forward} size={16} />
          </button>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 2, marginRight: "auto" }}>
          {topItems.map((it) => (
            <NavLink
              key={it.id}
              to={it.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                textDecoration: "none",
                color: isActive ? "var(--color-text)" : "var(--color-neutral-600)",
                padding: "5px 10px",
                borderRadius: 7,
                background: isActive ? "var(--color-neutral-200)" : "transparent",
              })}
            >
              <Icon path={it.icon} size={14} className="opacity-85" />
              {it.label}
            </NavLink>
          ))}
          {moreItems.length > 0 && (
            <select
              className="input"
              style={{ width: "auto", minHeight: 28, marginLeft: 4 }}
              value={activeMoreId}
              onChange={(e) => {
                const it = moreItems.find((m) => m.id === e.target.value);
                if (it) navigate(it.path);
              }}
            >
              <option value="">Plus…</option>
              {moreItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          )}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggleButton />
          <span className="text-muted" style={{ fontSize: 12 }}>
            {name}
          </span>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: "var(--color-accent)",
              color: "var(--color-bg)",
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {initials(name)}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <Icon path={CHROME_ICONS.logout} size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
