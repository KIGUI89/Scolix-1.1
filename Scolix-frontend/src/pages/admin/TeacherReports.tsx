import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTeacherReport,
  listAdminTeacherReports,
  respondToTeacherReport,
  warnTeacherForReport,
} from "../../services/evaluations";
import { usePageChrome } from "../../store/pageChromeStore";
import { useBreadcrumb } from "../../store/breadcrumbStore";
import {
  TEACHER_REPORT_STATUS_LABEL,
  TEACHER_REPORT_STATUS_TAG as REPORT_STATUS_TAG,
  type TeacherReportStatus,
} from "../../types/evaluation";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_FILTERS: { value: TeacherReportStatus | ""; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "NEW", label: "Nouveaux" },
  { value: "READ", label: "Lus" },
  { value: "TREATED", label: "Traités" },
];

/** Liste des signalements d'étudiants (admin/directeur), filtrable par statut. */
export function TeacherReports() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TeacherReportStatus | "">("");

  usePageChrome({ hideCreate: true });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-teacher-reports", status],
    queryFn: () => listAdminTeacherReports(status || undefined),
  });

  return (
    <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h4 style={{ margin: 0, marginRight: "auto" }}>Signalements des étudiants</h4>
        <div className="seg" style={{ background: "var(--color-neutral-300)" }}>
          {STATUS_FILTERS.map((f) => (
            <label key={f.value} className={`seg-opt ${status === f.value ? "active" : ""}`}>
              <input
                type="radio"
                name="report-status"
                checked={status === f.value}
                onChange={() => setStatus(f.value)}
                style={{ display: "none" }}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="text-muted" style={{ fontSize: 13 }}>
          Chargement…
        </div>
      ) : reports.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13 }}>
          {status ? "Aucun signalement avec ce statut." : "Aucun signalement reçu pour le moment."}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Étudiant</th>
              <th>Enseignant</th>
              <th>Département</th>
              <th>Reçu le</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/signalements/${r.id}`)}>
                <td style={{ fontWeight: r.status === "NEW" ? 600 : 400 }}>{r.title}</td>
                <td>{r.student_name}</td>
                <td>{r.teacher_name}</td>
                <td className="text-muted">{r.department_name ?? "—"}</td>
                <td className="text-muted">{fmtDateTime(r.created_at)}</td>
                <td>
                  <span className={`tag ${REPORT_STATUS_TAG[r.status]}`}>{TEACHER_REPORT_STATUS_LABEL[r.status]}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="btn btn-ghost">
                    Ouvrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MessageForm({
  label,
  placeholder,
  submitLabel,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (message: string) => Promise<unknown>;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setError(null);
        setPending(true);
        try {
          await onSubmit(message.trim());
          setMessage("");
        } catch {
          setError("L'envoi a échoué. Réessayez.");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="field">
        <label>{label}</label>
        <textarea
          className="input"
          rows={4}
          required
          style={{ minHeight: 96, padding: "8px 10px" }}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
      <button type="submit" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} disabled={pending || !message.trim()}>
        {pending ? "Envoi…" : submitLabel}
      </button>
    </form>
  );
}

/** Détail d'un signalement : réponse à l'étudiant et mise en garde à l'enseignant. */
export function TeacherReportDetail() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [warnInfo, setWarnInfo] = useState<string | null>(null);

  usePageChrome({ hideCreate: true });

  const { data: report, isError } = useQuery({
    queryKey: ["admin-teacher-report", reportId],
    queryFn: () => getAdminTeacherReport(reportId),
    enabled: !!reportId,
  });

  useBreadcrumb([{ label: "Signalements", onClick: () => navigate("/signalements") }, { label: report?.title ?? "Détail" }]);

  const refresh = (data: unknown) => {
    qc.setQueryData(["admin-teacher-report", reportId], data);
    qc.invalidateQueries({ queryKey: ["admin-teacher-reports"] });
  };
  const respond = useMutation({ mutationFn: (m: string) => respondToTeacherReport(reportId, m), onSuccess: refresh });
  const warn = useMutation({
    mutationFn: (m: string) => warnTeacherForReport(reportId, m),
    onSuccess: (data) => {
      refresh(data);
      setWarnInfo(
        data.teacher_notified
          ? "Mise en garde envoyée : l'enseignant a été notifié."
          : "Mise en garde enregistrée, mais cet enseignant n'a pas de compte actif : aucune notification n'a pu lui être envoyée."
      );
    },
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="text-muted">Ce signalement est introuvable.</div>
      </div>
    );
  }
  if (!report) return null;

  const info: [string, string][] = [
    ["Étudiant", `${report.student_name} — ${report.student_email}`],
    ["Enseignant", report.teacher_name],
    ["Département", report.department_name ?? "—"],
    ["Reçu le", fmtDateTime(report.created_at)],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h4 style={{ margin: 0, marginRight: "auto" }}>{report.title}</h4>
          <span className={`tag ${REPORT_STATUS_TAG[report.status]}`}>{TEACHER_REPORT_STATUS_LABEL[report.status]}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 13 }}>
          {info.map(([k, v]) => (
            <div key={k}>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {k}
              </div>
              <div>{v}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
            Description
          </div>
          <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{report.description}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 22 }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Réponse à l'étudiant</h4>
          {report.admin_response ? (
            <>
              <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{report.admin_response}</p>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Envoyée le {report.response_at ? fmtDateTime(report.response_at) : "—"}
              </div>
            </>
          ) : (
            <MessageForm
              label="Message à l'étudiant"
              placeholder="Votre réponse sera visible par l'étudiant sur sa page Rapport."
              submitLabel="Envoyer la réponse"
              onSubmit={(m) => respond.mutateAsync(m)}
            />
          )}
        </div>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0 }}>Mise en garde à l'enseignant</h4>
          {report.teacher_warning ? (
            <>
              <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{report.teacher_warning}</p>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Envoyée le {report.warned_at ? fmtDateTime(report.warned_at) : "—"}
              </div>
            </>
          ) : (
            <MessageForm
              label="Message à l'enseignant"
              placeholder="L'enseignant reçoit ce message en notification, sans l'identité de l'étudiant."
              submitLabel="Envoyer la mise en garde"
              onSubmit={(m) => warn.mutateAsync(m)}
            />
          )}
          {warnInfo && (
            <div className="text-muted" style={{ fontSize: 12 }}>
              {warnInfo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
