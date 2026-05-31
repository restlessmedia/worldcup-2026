export function ColumnHeader({ label, hint }) {
  return (
    <th scope="col" title={hint || undefined}>
      <span className="col-head">
        <span className="col-head__label">{label}</span>
        {hint ? <span className="col-head__hint">{hint}</span> : null}
      </span>
    </th>
  );
}
