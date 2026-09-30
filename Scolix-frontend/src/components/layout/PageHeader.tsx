interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
}

export function PageHeader({ kicker, title, subtitle }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--color-divider)",
        paddingBottom: 14,
      }}
    >
      <div style={{ marginRight: "auto" }}>
        {kicker && (
          <div className="card-kicker" style={{ marginBottom: 5, color: "var(--color-neutral-700)" }}>
            {kicker}
          </div>
        )}
        <h3 style={{ margin: subtitle ? "0 0 3px" : 0 }}>{title}</h3>
        {subtitle && (
          <p className="text-muted" style={{ fontSize: 13, margin: 0, maxWidth: "80ch" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
