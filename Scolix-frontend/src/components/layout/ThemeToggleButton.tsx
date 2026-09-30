import { Icon } from "../ui/Icon";
import { CHROME_ICONS } from "./chromeIcons";
import { useThemeStore } from "../../store/themeStore";

export function ThemeToggleButton() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const label = theme === "dark" ? "Passer en thème jour" : "Passer en thème nuit";
  const path = theme === "dark" ? CHROME_ICONS.themeMoon : CHROME_ICONS.themeSun;
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      <Icon path={path} />
    </button>
  );
}
