export function EliminatedBadge({ compact = false, className = "" }) {
  return (
    <span
      className={`team-out-badge${compact ? " team-out-badge--compact" : ""}${className ? ` ${className}` : ""}`}
      title="Eliminated from the World Cup"
    >
      <svg className="team-out-badge__cross" viewBox="0 0 16 16" aria-hidden="true">
        <path className="team-out-badge__cross-line" d="M4.5 4.5 11.5 11.5" />
        <path className="team-out-badge__cross-line" d="M11.5 4.5 4.5 11.5" />
      </svg>
      {!compact ? <span className="team-out-badge__label">Out</span> : null}
    </span>
  );
}
