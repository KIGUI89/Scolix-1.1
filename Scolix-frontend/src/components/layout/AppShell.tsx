import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TopNav } from "./TopNav";
import { ContentHeader } from "./ContentHeader";
import { PageHeader } from "./PageHeader";
import { metaForPath } from "../../router/routeMeta";
import { useUiStore } from "../../store/uiStore";
import { useNavHistoryStore } from "../../store/navHistoryStore";
import { usePageTitleStore } from "../../store/pageTitleStore";

export function AppShell() {
  const location = useLocation();
  const meta = metaForPath(location.pathname);
  const titleOverride = usePageTitleStore((s) => s.title);
  const title = titleOverride ?? meta.title;
  const navMode = useUiStore((s) => s.navMode);
  const pushHistory = useNavHistoryStore((s) => s.push);

  useEffect(() => {
    pushHistory(location.pathname);
  }, [location.pathname, pushHistory]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-neutral-100)",
        color: "var(--color-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {navMode === "top" && <TopNav />}
      <TopBar title={title} />
      <div style={{ display: "flex", flex: 1, alignItems: "stretch", padding: "14px 0 0 14px", gap: 10 }}>
        {navMode === "side" && <Sidebar />}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-bg)",
            boxShadow: "var(--shadow-panel)",
            overflow: "hidden",
          }}
        >
          <ContentHeader title={title} />
          <main style={{ flex: 1, minWidth: 0, padding: "20px 16px 56px", display: "flex", flexDirection: "column", gap: 20 }}>
            <PageHeader kicker={meta.kicker} title={title} subtitle={meta.subtitle} />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
