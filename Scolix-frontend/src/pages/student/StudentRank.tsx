import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTeacherRanking } from "../../services/evaluations";
import { fmtNumber } from "../../lib/format";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export function StudentRank() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["teacher-ranking", scope], queryFn: () => getTeacherRanking(scope) });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.teacher_name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const maxScore = Math.max(1, ...rows.map((r) => r.avg_score));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ maxWidth: 340 }}
          placeholder="Rechercher un enseignant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg">
          <label className={`seg-opt ${scope === "mine" ? "active" : ""}`}>
            <input type="radio" name="rankscope" checked={scope === "mine"} onChange={() => setScope("mine")} style={{ display: "none" }} />
            Ma filière
          </label>
          <label className={`seg-opt ${scope === "all" ? "active" : ""}`}>
            <input type="radio" name="rankscope" checked={scope === "all"} onChange={() => setScope("all")} style={{ display: "none" }} />
            Tout l'établissement
          </label>
        </div>
      </div>
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Enseignant</th>
              <th>Département</th>
              <th>Score étudiants</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.teacher_id}>
                <td>
                  <span className="tag tag-rank">{r.rank}</span>
                </td>
                <td style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 11, background: "var(--color-neutral-200)" }}>
                    {initials(r.teacher_name)}
                  </span>
                  <div style={{ minWidth: 0, fontSize: 13 }}>{r.teacher_name}</div>
                </td>
                <td className="text-muted">{r.department_name}</td>
                <td style={{ minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--color-neutral-200)" }}>
                      <div style={{ height: 6, borderRadius: 999, width: `${(r.avg_score / maxScore) * 100}%`, background: "var(--color-accent)" }} />
                    </div>
                    <span style={{ fontSize: 12 }}>{fmtNumber(r.avg_score, 1)}/100</span>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun classement disponible pour le moment — il est publié à la clôture de chaque campagne.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Classement par moyenne des scores globaux reçus, publié à la clôture de chaque campagne (seules les campagnes clôturées sont prises en compte).
      </p>
    </div>
  );
}
