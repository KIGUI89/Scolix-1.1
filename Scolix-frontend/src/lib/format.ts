export function fmtNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${fmtNumber(value, decimals)} %`;
}
