import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";
import { listNotifications, markAllRead, markRead } from "../../services/notifications";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });
  const unread = notifications.filter((n) => n.status !== "READ").length;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <Icon path={CHROME_ICONS.bell} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--color-success)",
            }}
          />
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            zIndex: 30,
            width: 320,
            maxHeight: 360,
            overflowY: "auto",
            boxShadow: "var(--shadow-panel)",
            padding: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
            <span className="text-muted" style={{ fontSize: 12 }}>Notifications</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: "2px 6px" }}
              onClick={async () => {
                await markAllRead();
                qc.invalidateQueries({ queryKey: ["notifications"] });
              }}
            >
              Tout marquer lu
            </button>
          </div>
          {notifications.length === 0 && (
            <div className="text-muted" style={{ fontSize: 12, padding: "10px 8px" }}>
              Aucune notification.
            </div>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={async () => {
                if (n.status !== "READ") await markRead(n.id);
                qc.invalidateQueries({ queryKey: ["notifications"] });
                // Les notifications de signalement mènent à la page concernée.
                if (n.notif_type === "REPORT_NEW" && n.related_resource_id) {
                  setOpen(false);
                  navigate(`/signalements/${n.related_resource_id}`);
                } else if (n.notif_type === "REPORT_RESPONSE") {
                  setOpen(false);
                  navigate("/mes-rapports");
                }
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px",
                borderRadius: 6,
                background: n.status === "READ" ? "transparent" : "var(--color-accent-100)",
                border: "none",
                cursor: "pointer",
                marginBottom: 2,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500 }}>{n.title}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>{n.message}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
