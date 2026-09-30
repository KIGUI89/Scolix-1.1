import { useState } from "react";
import { useNavigate } from "react-router-dom";
import iconLight from "../../assets/brand/scolix-icon-light.png";
import wordmarkLight from "../../assets/brand/scolix-wordmark-light.png";
import { Icon } from "../../components/ui/Icon";
import { CHROME_ICONS } from "../../components/layout/chromeIcons";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { login as loginRequest } from "../../services/auth";
import { ROLE_HOME } from "../../lib/user";
import { isAxiosError } from "axios";

export function LoginPage() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const logoFilter = theme === "dark" ? "invert(1)" : "none";

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginRequest(email, password);
      setSession({ access: res.access, refresh: res.refresh }, res.user);
      navigate(ROLE_HOME[res.user.role] ?? "/dashboard", { replace: true });
    } catch (err) {
      if (isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 400)) {
        setError("E-mail ou mot de passe incorrect.");
      } else {
        setError("Impossible de se connecter au serveur. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.15fr 1fr",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <div
        style={{
          padding: "64px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "var(--color-neutral-100)",
          borderRight: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, marginBottom: 32 }}>
          <img src={iconLight} alt="Scolix" style={{ height: 86, width: "auto", filter: logoFilter }} />
          <img src={wordmarkLight} alt="Scolix" style={{ height: 62, width: "auto", filter: logoFilter }} />
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--color-neutral-600)",
            }}
          >
            Pilotez votre école, libérez leur potentiel
          </span>
        </div>
        <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 24 }}>
          <h1 style={{ fontSize: 44, margin: 0 }}>Évaluation multicritère des enseignants</h1>
          <p style={{ fontSize: 15, margin: 0, maxWidth: "44ch", color: "var(--color-neutral-600)" }}>
            Collecte anonyme, scores pondérés, analyse comparative et recommandations de formation — sur une seule
            plateforme.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
              gap: 1,
              background: "var(--color-divider)",
              border: "1px solid var(--color-divider)",
              marginTop: 16,
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {[
              ["6", "critères"],
              ["8", "modules"],
              ["100 %", "anonyme"],
            ].map(([value, label]) => (
              <div key={label} style={{ background: "var(--color-surface)", padding: "16px 18px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, display: "flex", gap: 20, color: "var(--color-neutral-600)" }}>
          <span>Conformité RGPD</span>
          <span>Hash SHA-256</span>
          <span>HTTPS / TLS</span>
        </div>
      </div>

      <div style={{ padding: "64px 72px", display: "flex", alignItems: "center", position: "relative" }}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={theme === "dark" ? "Passer en thème jour" : "Passer en thème nuit"}
          style={{ position: "absolute", top: 24, right: 28 }}
        >
          <Icon path={theme === "dark" ? CHROME_ICONS.themeMoon : CHROME_ICONS.themeSun} />
        </button>

        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
            <form onSubmit={handleContinue} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Espace administration
                </div>
                <h3 style={{ marginBottom: 6 }}>Connexion</h3>
                <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                  Accès réservé aux comptes de l'annuaire universitaire.
                </p>
              </div>
              <div className="field">
                <label>Adresse e-mail institutionnelle</label>
                <input
                  className="input"
                  style={{ minHeight: 44 }}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="a.benali@univ.exemple.fr"
                />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input
                  className="input"
                  style={{ minHeight: 44 }}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div style={{ fontSize: 12, color: "#F43F5E" }}>{error}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="radio">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Se souvenir de moi
                </label>
                <a href="#" style={{ fontSize: 13 }}>
                  Mot de passe oublié
                </a>
              </div>
              <button type="submit" className="btn btn-secondary btn-block" disabled={loading}>
                {loading ? "Connexion…" : "Continuer"}
              </button>
              <div
                style={{
                  borderTop: "1px solid var(--color-divider)",
                  paddingTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <button type="button" className="btn btn-secondary btn-block" disabled>
                  Se connecter via l'annuaire (SSO)
                </button>
                <span className="text-muted" style={{ fontSize: 11 }}>
                  Disponible en v2 — LDAP / SAML
                </span>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
