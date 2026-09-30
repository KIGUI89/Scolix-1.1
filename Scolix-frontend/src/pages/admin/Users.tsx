import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAccounts } from "../../services/accounts";
import { UserFormModal } from "./UserFormModal";
import { ROLE_LABELS } from "../../lib/user";
import { extractErrorMessage } from "../../lib/errors";
import { usePageCreateAction } from "../../hooks/usePageCreateAction";
import { useSearchContent } from "../../store/searchContentStore";
import { useAffichageContent } from "../../store/affichageContentStore";
import { useHiddenRows } from "../../hooks/useHiddenRows";
import { EditButton } from "../../components/ui/EditButton";
import { DeleteButton } from "../../components/ui/DeleteButton";
import { HiddenRowsBanner } from "../../components/ui/HiddenRowsBanner";
import type { Role } from "../../types/auth";
import type { PlatformAccount } from "../../types/account";

const ROLE_FILTERS: Role[] = ["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"];

const EMPTY_ROLE_MESSAGE: Record<Role, string> = {
  ADMIN: "Aucun administrateur enregistré pour le moment.",
  DIRECTOR: "Aucun directeur enregistré pour le moment.",
  TEACHER: "Aucun enseignant enregistré pour le moment.",
  STUDENT: "Aucun étudiant enregistré pour le moment.",
};

export function Users() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlatformAccount | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Role | "">("");

  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["accounts", roleFilter], queryFn: () => listAccounts(roleFilter || undefined) });
  const { hidden, hide, restore, isHidden } = useHiddenRows("hidden-accounts");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = accounts;
    if (q) {
      rows = rows.filter(
        (a) =>
          a.email.toLowerCase().includes(q) ||
          ROLE_LABELS[a.role].toLowerCase().includes(q) ||
          (a.teacher_name ?? "").toLowerCase().includes(q) ||
          (a.student_name ?? "").toLowerCase().includes(q)
      );
    }
    if (!showHidden) rows = rows.filter((a) => !isHidden(a.id));
    return rows;
  }, [accounts, search, showHidden, isHidden]);

  usePageCreateAction("Nouvel utilisateur", () => setCreating(true));

  useSearchContent(() => (
    <input
      className="input"
      placeholder="Rechercher un utilisateur (nom, e-mail, privilège…)"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      autoFocus
    />
  ));

  useAffichageContent(() => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          padding: "6px 8px",
          borderRadius: 6,
          cursor: "pointer",
          background: roleFilter === "" ? "var(--color-neutral-200)" : "transparent",
        }}
      >
        <input type="radio" name="user-role-filter" checked={roleFilter === ""} onChange={() => setRoleFilter("")} />
        Tous les utilisateurs
      </label>
      {ROLE_FILTERS.map((r) => (
        <label
          key={r}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "6px 8px",
            borderRadius: 6,
            cursor: "pointer",
            background: roleFilter === r ? "var(--color-neutral-200)" : "transparent",
          }}
        >
          <input type="radio" name="user-role-filter" checked={roleFilter === r} onChange={() => setRoleFilter(r)} />
          {ROLE_LABELS[r]}
        </label>
      ))}
    </div>
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <HiddenRowsBanner count={hidden.size} show={showHidden} onToggle={() => setShowHidden((v) => !v)} />
      {isLoading && (
        <div className="card" style={{ padding: 24 }}>
          <div className="text-muted">Chargement…</div>
        </div>
      )}
      {!isLoading && isError && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ color: "#F43F5E" }}>{extractErrorMessage(error, "Impossible de charger les utilisateurs.")}</div>
        </div>
      )}
      {!isLoading && !isError && accounts.length === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div className="text-muted">{roleFilter ? EMPTY_ROLE_MESSAGE[roleFilter] : "Aucun utilisateur enregistré pour le moment."}</div>
        </div>
      )}
      {!isLoading && !isError && accounts.length > 0 && (
      <div className="card" style={{ padding: "8px 26px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>E-mail / identifiant</th>
              <th>Rôle de sécurité</th>
              <th>Profil associé</th>
              <th>État du compte</th>
              <th>Création</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const hiddenRow = isHidden(u.id);
              return (
                <Fragment key={u.id}>
                  <tr
                    style={{ cursor: "pointer", opacity: hiddenRow ? 0.5 : 1 }}
                    onClick={() => setExpandedId((id) => (id === u.id ? null : u.id))}
                  >
                    <td style={{ fontFamily: "var(--font-heading)" }}>{u.email}</td>
                    <td>
                      <span className={`tag ${u.role === "ADMIN" || u.role === "DIRECTOR" ? "tag-outline" : "tag-accent"}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="text-muted">{u.teacher_name || u.student_name || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span className={`tag ${u.is_active ? "tag-active" : "tag-inactive"}`}>{u.is_active ? "Actif" : "Inactif"}</span>
                        {u.is_verified && <span className="tag tag-verif">Vérifié</span>}
                      </div>
                    </td>
                    <td className="text-muted">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      {hiddenRow ? (
                        <button type="button" className="btn btn-ghost" onClick={() => restore(u.id)}>
                          Restaurer
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <EditButton onClick={() => setEditing(u)} />
                          <DeleteButton
                            onClick={() => {
                              if (confirm(`Retirer le compte ${u.email} de l'affichage ? La donnée reste conservée en base.`)) hide(u.id);
                            }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === u.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--color-surface)", padding: "14px 18px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Identifiant
                            </div>
                            <div style={{ fontFamily: "var(--font-heading)" }}>{u.id}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Profil enseignant
                            </div>
                            <div>{u.teacher_name ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Profil étudiant
                            </div>
                            <div>{u.student_name ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              Créé le
                            </div>
                            <div>{new Date(u.created_at).toLocaleString("fr-FR")}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center", padding: "16px 0" }}>
                  Aucun compte ne correspond à la recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      {creating && <UserFormModal onClose={() => setCreating(false)} />}
      {editing && <UserFormModal account={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
