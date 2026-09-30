import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSemesters } from "../../services/sync";
import { getDefaultSemester } from "../../lib/semesters";
import { useDashboardFilterStore } from "../../store/dashboardFilterStore";
import { useAffichageContentStore } from "../../store/affichageContentStore";
import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";

export function AffichageFilterButton() {
  const [open, setOpen] = useState(false);
  const override = useAffichageContentStore((s) => s.render);
  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: listSemesters });
  const semesterId = useDashboardFilterStore((s) => s.semesterId);
  const setSemesterId = useDashboardFilterStore((s) => s.setSemesterId);

  useEffect(() => {
    if (!semesterId && semesters.length > 0) {
      const def = getDefaultSemester(semesters);
      if (def) setSemesterId(def.id);
    }
  }, [semesterId, semesters, setSemesterId]);

  const current = semesters.find((s) => s.id === semesterId);
  const years = Array.from(new Set(semesters.map((s) => s.academic_year))).sort().reverse();
  const [yearOverride, setYearOverride] = useState<string | null>(null);
  const year = yearOverride ?? current?.academic_year ?? years[0] ?? "";
  const yearSemesters = semesters.filter((s) => s.academic_year === year);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        onClick={() => setOpen((v) => !v)}
        title="Affichage"
        aria-label="Affichage"
      >
        <Icon path={CHROME_ICONS.display} size={14} />
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            zIndex: 30,
            width: 260,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow: "var(--shadow-panel)",
          }}
        >
          {override ? (
            override()
          ) : (
            <>
              <div className="field">
                <label>Année académique</label>
                <select
                  className="input"
                  value={year}
                  onChange={(e) => {
                    const y = e.target.value;
                    setYearOverride(y);
                    const first = semesters.find((s) => s.academic_year === y);
                    if (first) setSemesterId(first.id);
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Semestre</label>
                <select className="input" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                  {yearSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
