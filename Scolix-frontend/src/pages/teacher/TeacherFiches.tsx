import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMySubmissions } from "../../services/evaluations";
import { fmtNumber } from "../../lib/format";
import { moduleState } from "../../lib/teacherModuleState";
import { SubmissionDetailModal } from "../../components/evaluations/SubmissionDetailModal";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function TeacherFiches() {
  const { data: submissions = [] } = useQuery({ queryKey: ["my-submissions"], queryFn: listMySubmissions });
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("ALL");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = viewingId ? submissions.find((s) => s.id === viewingId) ?? null : null;

  const modules = useMemo(() => Array.from(new Set(submissions.map((s) => s.course_code))).sort(), [submissions]);

  const rows = useMemo(() => {
    return submissions
      .map((s) => ({
        id: `FIC-${s.id.slice(0, 6).toUpperCase()}`,
        submissionId: s.id,
        course_code: s.course_code,
        course_name: s.course_name,
        when: s.submitted_at,
        score: s.global_score,
        comment: s.responses.find((r) => r.comment)?.comment ?? "",
      }))
      .filter((r) => (scope === "ALL" ? true : r.course_code === scope))
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return r.comment.toLowerCase().includes(q) || r.course_name.toLowerCase().includes(q) || r.course_code.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));
  }, [submissions, scope, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ maxWidth: 340 }}
          placeholder="Rechercher dans les commentaires…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg">
          <label className={`seg-opt ${scope === "ALL" ? "active" : ""}`}>
            <input type="radio" name="fichescope" checked={scope === "ALL"} onChange={() => setScope("ALL")} style={{ display: "none" }} />
            Tous les modules
          </label>
          {modules.map((code) => (
            <label key={code} className={`seg-opt ${scope === code ? "active" : ""}`}>
              <input type="radio" name="fichescope" checked={scope === code} onChange={() => setScope(code)} style={{ display: "none" }} />
              {code}
            </label>
          ))}
        </div>
        <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          {submissions.length} fiche{submissions.length > 1 ? "s" : ""} · identités masquées
        </span>
      </div>
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Fiche</th>
              <th>Module</th>
              <th>Reçue le</th>
              <th>Score</th>
              <th>Commentaire</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: 13 }}>{r.id}</td>
                <td>{r.course_code}</td>
                <td className="text-muted">{r.when ? fmtDate(r.when) : "—"}</td>
                <td>
                  {r.score !== null ? (
                    <span className={`tag ${moduleState(Number(r.score)).tag}`}>{fmtNumber(Number(r.score), 0)}/100</span>
                  ) : (
                    <span className="tag tag-outline">—</span>
                  )}
                </td>
                <td className="text-muted" style={{ maxWidth: 340 }}>
                  {r.comment || "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setViewingId(r.submissionId)}>
                    Ouvrir
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucune fiche ne correspond à ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
        Les fiches sont anonymisées à la réception : aucun identifiant étudiant n'est conservé avec les réponses.
      </p>
      {viewing && <SubmissionDetailModal submission={viewing} onClose={() => setViewingId(null)} />}
    </div>
  );
}
