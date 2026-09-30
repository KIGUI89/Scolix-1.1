interface PredictionChartProps {
  history: { label: string; value: number }[];
  predicted: number | null;
}

const W = 340;
const H = 150;
const PAD_X = 12;
const TOP = 10;
const BOTTOM = 140;

export function PredictionChart({ history, predicted }: PredictionChartProps) {
  const values = [...history.map((h) => h.value), ...(predicted != null ? [predicted] : [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const totalPoints = history.length + (predicted != null ? 1 : 0);
  const step = totalPoints > 1 ? (W - PAD_X * 2) / (totalPoints - 1) : 0;

  const x = (i: number) => (totalPoints > 1 ? PAD_X + i * step : W / 2);
  const y = (v: number) => BOTTOM - ((v - min) / span) * (BOTTOM - TOP);

  const pastPoints = history.map((h, i) => `${x(i).toFixed(1)},${y(h.value).toFixed(1)}`).join(" ");
  const lastHistIdx = history.length - 1;
  const futurePoints =
    predicted != null && history.length > 0
      ? `${x(lastHistIdx).toFixed(1)},${y(history[lastHistIdx].value).toFixed(1)} ${x(history.length).toFixed(1)},${y(predicted).toFixed(1)}`
      : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <line x1={0} y1={BOTTOM} x2={W} y2={BOTTOM} stroke="var(--color-divider)" />
      {history.length > 1 && <polyline points={pastPoints} fill="none" stroke="var(--color-accent-800)" strokeWidth={1.8} />}
      {futurePoints && <polyline points={futurePoints} fill="none" stroke="var(--color-accent-400)" strokeWidth={1.8} strokeDasharray="5 4" />}
      {history.map((h, i) => (
        <circle key={h.label + i} cx={x(i)} cy={y(h.value)} r={2.5} fill="var(--color-accent-800)" />
      ))}
      {predicted != null && <circle cx={x(history.length)} cy={y(predicted)} r={3} fill="var(--color-accent-400)" />}
    </svg>
  );
}
