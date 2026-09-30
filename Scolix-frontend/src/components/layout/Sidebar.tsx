import { NavLink, useNavigate } from "react-router-dom";
import iconLight from "../../assets/brand/scolix-icon-light.png";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { useUiStore } from "../../store/uiStore";
import { navForRole } from "../../router/nav";
import { displayName, initials, ROLE_LABELS, ROLE_SHORT_LABELS } from "../../lib/user";

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const groups = navForRole(user?.role);
  const logoFilter = theme === "dark" ? "invert(1)" : "none";
  const name = displayName(user);

  return (
    <aside
      style={{
        width: collapsed ? 64 : 232,
        flex: "none",
        background: "var(--color-neutral-100)",
        borderRadius: "14px 14px 0 0",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 14,
        alignSelf: "flex-start",
        height: "calc(100vh - 14px)",
        transition: "width 0.15s ease",
      }}
    >
      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, height: 24 }}>
          <img src={iconLight} alt="" style={{ height: 20, width: "auto", flex: "none", filter: logoFilter }} />
          {!collapsed && (
            <span className="text-muted" style={{ fontSize: 11, marginLeft: "auto" }}>
              {user ? ROLE_SHORT_LABELS[user.role] : ""}
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title="Rechercher"
            aria-label="Rechercher"
            style={{ marginLeft: collapsed ? "auto" : 0 }}
          >
            <Icon path={CHROME_ICONS.search} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggleSidebar}
            title={collapsed ? "Développer" : "Réduire"}
            aria-label={collapsed ? "Développer" : "Réduire"}
          >
            <Icon path={CHROME_ICONS.collapse} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 0 10px" }}>
        {groups.map((g) => (
          <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 14 }}>
            {!collapsed && (
              <div className="text-muted" style={{ fontSize: 12, padding: "2px 16px 6px" }}>
                {g.title}
              </div>
            )}
            {g.items.map((it) => (
              <NavLink
                key={it.id}
                to={it.path}
                title={it.label}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10,
                  fontSize: 13,
                  textDecoration: "none",
                  color: "var(--color-text)",
                  fontWeight: isActive ? 600 : 400,
                  padding: "6px 10px",
                  background: isActive ? "var(--color-neutral-300)" : "transparent",
                  borderRadius: "var(--radius-md)",
                  margin: "0 8px",
                })}
              >
                <Icon path={it.icon} size={20} className="opacity-85" />
                {!collapsed && <span>{it.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "var(--color-accent)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            flex: "none",
          }}
        >
          {initials(name)}
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
            <div className="text-muted" style={{ fontSize: 10 }}>
              {user ? ROLE_LABELS[user.role] : ""}
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          style={{ marginLeft: collapsed ? 0 : "auto" }}
          onClick={() => {
            logout();
            navigate("/login");
          }}
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <Icon path={CHROME_ICONS.logout} size={18} />
        </button>
      </div>
    </aside>
  );
}
