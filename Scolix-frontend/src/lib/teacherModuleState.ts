// global_score is on a 0-100 scale in this app (see admin dashboard's "score global moyen");
// the mockup's own thresholds were expressed on a /5 scale (4.2, 3.8) — scaled ×20 here.
export function moduleState(score: number): { tag: string; label: string } {
  if (score >= 84) return { tag: "tag-exc", label: "Très favorable" };
  if (score >= 76) return { tag: "tag-prog", label: "Favorable" };
  return { tag: "tag-watch", label: "À travailler" };
}
