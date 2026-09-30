import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useStudentTasks } from "../../hooks/useStudentTasks";
import { useAuthStore } from "../../store/authStore";
import { displayName } from "../../lib/user";
import { usePageTitle } from "../../hooks/usePageTitle";

export function StudentHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const firstName = displayName(user).split(" ")[0] || "";
  usePageTitle(firstName ? `Bonjour ${firstName}` : null);

  const { tasks, isLoading } = useStudentTasks();

  const totalCourses = tasks.length;
  const done = tasks.filter((t) => t.state === "Terminée").length;
  const pending = tasks.filter((t) => t.state !== "Terminée");
  const participationPct = totalCourses > 0 ? Math.round((done / totalCourses) * 100) : 0;

  const nextDeadline = useMemo(() => {
    const withDeadline = pending.filter((t) => t.daysLeft !== null).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
    return withDeadline[0] ?? null;
  }, [pending]);

  const priority = useMemo(() => [...pending].sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)).slice(0, 3), [pending]);

  const kpis = [
    { label: "À évaluer", value: String(pending.length), unit: "", note: `sur ${totalCourses} cours suivis` },
    { label: "Terminées", value: String(done), unit: "", note: "ce semestre" },
    {
      label: "Prochaine échéance",
      value: nextDeadline ? String(Math.max(nextDeadline.daysLeft ?? 0, 0)) : "—",
      unit: nextDeadline ? " j" : "",
      note: nextDeadline ? nextDeadline.course_name : "aucune évaluation en attente",
    },
    { label: "Participation", value: String(participationPct), unit: " %", note: "cours évalués sur le total suivi" },
  ];

  if (isLoading) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6, background: "var(--color-tile)", boxShadow: "var(--shadow-tile)", minWidth: 0 }}>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {k.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>{k.value}</span>
              <span className="text-muted" style={{ fontSize: 13 }}>
                {k.unit}
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 12, alignItems: "start" }}>
        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="card-title" style={{ marginRight: "auto" }}>
              À évaluer en priorité
            </span>
            <a href="/mes-evaluations" onClick={(e) => { e.preventDefault(); navigate("/mes-evaluations"); }} style={{ fontSize: 12, color: "var(--color-accent-700)" }}>
              Tout voir
            </a>
          </div>
          {priority.length === 0 && (
            <div className="text-muted" style={{ fontSize: 13, padding: "10px 0" }}>
              Aucune évaluation en attente — vous êtes à jour.
            </div>
          )}
          {priority.map((t) => (
            <div key={t.task_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
              <div style={{ minWidth: 0, marginRight: "auto" }}>
                <div style={{ fontSize: 13 }}>{t.course_name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {t.teacher_name} · {t.dueText}
                </div>
              </div>
              <span className={`tag ${t.tag}`}>{t.state}</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/evaluer?course=${t.course_id}&teacher=${t.teacher_id}`)}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="card-title">Votre anonymat</span>
            <p className="card-body" style={{ fontSize: 13 }}>
              Vos réponses ne sont jamais transmises nominativement à l'enseignant (identifiant pseudonymisé par hachage). L'administration conserve un accès à votre identité pour la gestion des campagnes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
