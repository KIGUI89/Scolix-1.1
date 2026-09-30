interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  /** "accent" (default) is the neutral blue on/off switch used app-wide; "status" recolors it
   * green/orange so the switch itself doubles as an actif/inactif indicator. */
  variant?: "accent" | "status";
}

export function ToggleSwitch({ checked, onChange, label, disabled, variant = "accent" }: ToggleSwitchProps) {
  const onColor = variant === "status" ? "var(--color-success)" : "var(--color-accent)";
  const offColor = variant === "status" ? "var(--color-warning)" : "var(--color-neutral-300)";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        display: "inline-flex",
        width: 40,
        height: 22,
        borderRadius: 999,
        padding: 3,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? onColor : offColor,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#F2F2F2",
          marginLeft: checked ? "auto" : 0,
        }}
      />
    </button>
  );
}
