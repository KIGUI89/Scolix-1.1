import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: 480,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          padding: 24,
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-panel)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>{title}</h4>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
