interface TrendPoint {
  label: string;
  value: number;
}

interface TrendLineChartProps {
  points: TrendPoint[];
}

const W = 320;
const H = 120;
const PAD_X = 10;
const TOP = 10;
const BOTTOM = 110;

export function TrendLineChart({ points }: TrendLineChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-muted" style={{ fontSize: 12, padding: "24px 0", textAlign: "center" }}>
        Pas encore de données pour tracer une tendance.
      </div>
    );
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = points.length > 1 ? (W - PAD_X * 2) / (points.length - 1) : 0;

  const x = (i: number) => (points.length > 1 ? PAD_X + i * step : W / 2);
  const y = (v: number) => BOTTOM - ((v - min) / span) * (BOTTOM - TOP);

  const linePoints = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const midY = (TOP + BOTTOM) / 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1={0} y1={BOTTOM} x2={W} y2={BOTTOM} stroke="var(--color-divider)" />
        <line x1={0} y1={midY} x2={W} y2={midY} stroke="var(--color-divider)" strokeDasharray="3 4" />
        {points.length > 1 && (
          <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
        )}
        {points.map((p, i) => (
          <circle key={p.label + i} cx={x(i)} cy={y(p.value)} r={2.5} fill="var(--color-accent)" />
        ))}
      </svg>
      <div className="text-muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        {points.map((p, i) => (
          <span key={p.label + i}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}
