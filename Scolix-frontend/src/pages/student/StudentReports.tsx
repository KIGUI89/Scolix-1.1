import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { listMyTeacherReports } from "../../services/evaluations";
import { TeacherReportFormModal } from "./TeacherReportFormModal";
import {
  TEACHER_REPORT_STATUS_LABEL,
  TEACHER_REPORT_STATUS_TAG as REPORT_STATUS_TAG,
  type TeacherReport,
} from "../../types/evaluation";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function printReport(report: TeacherReport) {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(report.title)}</title>
<style>
  body { font-family: Inter, -apple-system, system-ui, "Segoe UI", sans-serif; color: #1a1a1a; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .meta div { margin-bottom: 2px; }
  .content { white-space: pre-wrap; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px; }
</style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="meta">
    <div><strong>Enseignant :</strong> ${escapeHtml(report.teacher_name)}</div>
    ${report.department_name ? `<div><strong>Département :</strong> ${escapeHtml(report.department_name)}</div>` : ""}
    <div><strong>Rédigé le :</strong> ${escapeHtml(fmtDate(report.created_at))}</div>
    <div><strong>Auteur :</strong> ${escapeHtml(report.student_name)}</div>
  </div>
  <div class="content">${escapeHtml(report.description)}</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
}

export function StudentReports() {
  const { data: reports = [], isLoading } = useQuery({ queryKey: ["my-teacher-reports"], queryFn: listMyTeacherReports });
  const [creating, setCreating] = useState(false);

  usePageCreateAction("Nouveau rapport", () => setCreating(true));

  const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
        <h4 style={{ margin: 0 }}>Rapport</h4>
        {isLoading ? (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Chargement…
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 13 }}>
            Vous n'avez rédigé aucun rapport pour le moment. Utilisez le bouton « + » pour en créer un.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Enseignant</th>
                <th>Rédigé le</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>{r.title}</td>
                    <td>{r.teacher_name}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>
                      <span className={`tag ${REPORT_STATUS_TAG[r.status]}`}>{TEACHER_REPORT_STATUS_LABEL[r.status]}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="btn btn-ghost" onClick={() => printReport(r)}>
                        Exporter
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ background: "var(--color-surface)", padding: "10px 18px", fontSize: 13 }}>
                      {r.admin_response ? (
                        <>
                          <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                            Réponse de l'administration{r.response_at ? ` — ${fmtDate(r.response_at)}` : ""}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap" }}>{r.admin_response}</div>
                        </>
                      ) : (
                        <span className="text-muted">Aucune réponse de l'administration pour le moment.</span>
                      )}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && <TeacherReportFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
