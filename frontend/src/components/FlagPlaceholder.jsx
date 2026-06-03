/** Empty flag circle — used when a team slot has no country yet. */

export function FlagPlaceholder({ size, className = "", label }) {
  const style = size != null ? { width: size, height: size } : undefined;

  return (
    <span
      className={`flag-placeholder${className ? ` ${className}` : ""}`}
      style={style}
      role={label ? "img" : "presentation"}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 12h18M12 3c2.5 2.8 3.8 6.2 3.8 9s-1.3 6.2-3.8 9M12 3c-2.5 2.8-3.8 6.2-3.8 9s1.3 6.2 3.8 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}
