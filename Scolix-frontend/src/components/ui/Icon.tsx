interface IconProps {
  path?: string;
  paths?: string[];
  size?: number;
  className?: string;
}

export function Icon({ path, paths, size = 15, className }: IconProps) {
  const d = paths ?? (path ? [path] : []);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
