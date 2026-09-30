const STEPS = [
  { i: "1", label: "Fichier", note: "enseignants_2026.xlsx" },
  { i: "2", label: "Mapping", note: "en cours" },
  { i: "3", label: "Validation", note: "17 anomalies" },
  { i: "4", label: "Import", note: "en attente" },
];

const MAPPING = [
  { src: "Nom_Ens", sample: "Meddah", target: "nom_enseignant", conf: "98 %", tag: "tag-accent" },
  { src: "Prenom", sample: "Samir", target: "prenom_enseignant", conf: "96 %", tag: "tag-accent" },
  { src: "Mail", sample: "s.meddah@univ.fr", target: "email", conf: "91 %", tag: "tag-accent" },
  { src: "Dept", sample: "INFO", target: "departement", conf: "74 %", tag: "tag-neutral" },
  { src: "Charge_H", sample: "128", target: "volume_horaire", conf: "52 %", tag: "tag-outline" },
];

const ERRORS = [
  { n: "7", label: "Adresses e-mail invalides", rows: "lignes 44, 91, 132, 187, 340, 512, 908" },
  { n: "5", label: "Doublons détectés", rows: "même e-mail sur deux lignes" },
  { n: "3", label: "Champ obligatoire manquant", rows: "département absent" },
  { n: "2", label: "Format de date invalide", rows: "date_recrutement" },
];

const HISTORY = [
  { date: "18 août 2026", file: "cours_S1_2026.csv", status: "Succès", tag: "tag-accent" },
  { date: "02 août 2026", file: "etudiants_L3.xlsx", status: "Partiel", tag: "tag-neutral" },
  { date: "21 juil. 2026", file: "enseignants_v2.xlsx", status: "Échec", tag: "tag-outline" },
  { date: "30 juin 2026", file: "export_erp.csv", status: "Succès", tag: "tag-accent" },
];

export function DataImport() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
          gap: 1,
          background: "var(--color-divider)",
          border: "1px solid var(--color-divider)",
        }}
      >
        {STEPS.map((s, k) => (
          <div
            key={s.label}
            style={{
              background: k === 1 ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "var(--color-bg)",
              padding: "16px 18px",
              display: "flex",
              gap: 12,
              alignItems: "baseline",
            }}
          >
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 20, color: k <= 1 ? "var(--color-accent)" : "var(--color-neutral-500)" }}>{s.i}</span>
            <div>
              <div style={{ fontSize: 14 }}>{s.label}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {s.note}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
        <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h4 style={{ margin: 0, marginRight: "auto" }}>Mapping des colonnes</h4>
            <span className="text-muted" style={{ fontSize: 12 }}>
              enseignants_2026.xlsx — 1 204 lignes, UTF-8
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Colonne du fichier</th>
                <th>Exemple</th>
                <th>Champ de la plateforme</th>
                <th>Confiance</th>
              </tr>
            </thead>
            <tbody>
              {MAPPING.map((m) => (
                <tr key={m.src}>
                  <td style={{ fontFamily: "var(--font-heading)" }}>{m.src}</td>
                  <td className="text-muted">{m.sample}</td>
                  <td>
                    <select className="input" style={{ minHeight: 32 }} defaultValue={m.target} disabled>
                      <option value={m.target}>{m.target}</option>
                      <option value="">— ignorer cette colonne —</option>
                    </select>
                  </td>
                  <td>
                    <span className={`tag ${m.tag}`}>{m.conf}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" className="btn btn-secondary" disabled>
              Valider le mapping
            </button>
            <button type="button" className="btn btn-ghost" disabled>
              Réinitialiser
            </button>
            <label className="radio" style={{ marginLeft: "auto" }}>
              <input type="checkbox" checked disabled />
              Import partiel : ignorer les lignes en erreur
            </label>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h4 style={{ margin: 0, marginRight: "auto" }}>Contrôles de validation</h4>
              <span className="tag tag-outline">17 anomalies</span>
            </div>
            {ERRORS.map((e) => (
              <div
                key={e.label}
                style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)" }}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, minWidth: 28 }}>{e.n}</span>
                <div>
                  <div style={{ fontSize: 14 }}>{e.label}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {e.rows}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost" style={{ marginLeft: "auto" }} disabled>
                  Corriger
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} disabled>
              Télécharger le rapport d'erreurs
            </button>
          </div>

          <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0 }}>Historique des imports</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fichier</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.map((h) => (
                  <tr key={h.file}>
                    <td className="text-muted">{h.date}</td>
                    <td>{h.file}</td>
                    <td>
                      <span className={`tag ${h.tag}`}>{h.status}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="btn btn-ghost" disabled>
                        Annuler
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
