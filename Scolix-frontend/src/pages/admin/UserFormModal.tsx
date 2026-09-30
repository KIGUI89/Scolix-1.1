import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createAccount, listAccounts, updateAccount } from "../../services/accounts";
import { listTeachersDirectory } from "../../services/teachers";
import { listStudents } from "../../services/sync";
import { extractErrorMessage } from "../../lib/errors";
import type { Role } from "../../types/auth";
import type { PlatformAccount } from "../../types/account";

const ROLES: Role[] = ["ADMIN", "DIRECTOR", "TEACHER", "STUDENT"];
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrateur",
  DIRECTOR: "Direction",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
};

interface UserFormModalProps {
  account?: PlatformAccount;
  onClose: () => void;
}

export function UserFormModal({ account, onClose }: UserFormModalProps) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(account?.role ?? "TEACHER");
  const [profileId, setProfileId] = useState("");
  const [isActive, setIsActive] = useState(account?.is_active ?? true);
  const [isVerified, setIsVerified] = useState(account?.is_verified ?? false);
  const [error, setError] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: listAccounts, enabled: !account });
  const linkedTeacherIds = useMemo(() => new Set(accounts.map((a) => a.teacher_profile_id).filter(Boolean)), [accounts]);
  const linkedStudentIds = useMemo(() => new Set(accounts.map((a) => a.student_profile_id).filter(Boolean)), [accounts]);

  const { data: allTeachers = [] } = useQuery({
    queryKey: ["teachers-directory"],
    queryFn: () => listTeachersDirectory(),
    enabled: !account && role === "TEACHER",
  });
  const { data: allStudents = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
    enabled: !account && role === "STUDENT",
  });
  const teachers = useMemo(() => allTeachers.filter((t) => !linkedTeacherIds.has(t.id)), [allTeachers, linkedTeacherIds]);
  const students = useMemo(() => allStudents.filter((s) => !linkedStudentIds.has(s.id)), [allStudents, linkedStudentIds]);

  const mutation = useMutation({
    mutationFn: () =>
      account
        ? updateAccount(account.id, {
            email,
            role,
            is_active: isActive,
            is_verified: isVerified,
            ...(password ? { password } : {}),
          })
        : createAccount({
            email,
            password,
            role,
            teacher_profile_id: role === "TEACHER" ? profileId : undefined,
            student_profile_id: role === "STUDENT" ? profileId : undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (err) =>
      setError(extractErrorMessage(err, "Impossible d'enregistrer le compte (e-mail déjà utilisé, ou profil déjà lié à un autre compte).")),
  });

  return (
    <Modal title={account ? "Modifier l'utilisateur" : "Nouvel utilisateur"} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {!account && (
          <div className="field">
            <label>Mot de passe provisoire</label>
            <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {account && (
          <div className="field">
            <label>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
            <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label>Rôle de sécurité</label>
          <select
            className="input"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              setProfileId("");
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {!account && role === "TEACHER" && (
          <div className="field">
            <label>Profil enseignant associé</label>
            <select
              className="input"
              required
              value={profileId}
              onChange={(e) => {
                const id = e.target.value;
                setProfileId(id);
                const teacher = teachers.find((t) => t.id === id);
                if (teacher) setEmail(teacher.email);
              }}
            >
              <option value="">—</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.matricule})
                </option>
              ))}
            </select>
          </div>
        )}
        {!account && role === "STUDENT" && (
          <div className="field">
            <label>Profil étudiant associé</label>
            <select
              className="input"
              required
              value={profileId}
              onChange={(e) => {
                const id = e.target.value;
                setProfileId(id);
                const student = students.find((s) => s.id === id);
                if (student) setEmail(student.email);
              }}
            >
              <option value="">—</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.student_code})
                </option>
              ))}
            </select>
          </div>
        )}
        {account && (
          <>
            <label className="radio">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Compte actif
            </label>
            <label className="radio">
              <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
              Compte vérifié
            </label>
          </>
        )}
        {error && <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-secondary" disabled={mutation.isPending}>
            {mutation.isPending ? "Enregistrement…" : account ? "Enregistrer" : "Créer le compte"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
