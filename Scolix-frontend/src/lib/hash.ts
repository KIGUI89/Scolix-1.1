/**
 * Deterministic short pseudonym for an evaluator id, displayed instead of the
 * real identity in bias-audit tables — the platform's evaluations are anonymous
 * by design, so admins auditing evaluator bias should see a hash, not a name.
 */
export function pseudonym(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return `ÉVAL-${Math.abs(hash).toString(16).slice(0, 6).toUpperCase()}`;
}
