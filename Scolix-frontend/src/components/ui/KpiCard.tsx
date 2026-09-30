interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
}

export function KpiCard({ label, value, note }: KpiCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--color-tile)",
        boxShadow: "var(--shadow-tile)",
        minHeight: 134,
      }}
    >
      <div className="card-kicker" style={{ color: "var(--color-neutral-900)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 32, lineHeight: 1, color: "var(--color-neutral-900)" }}>
        {value}
      </div>
      {note && <div style={{ fontSize: 12, color: "var(--color-neutral-900)" }}>{note}</div>}
    </div>
  );
}
