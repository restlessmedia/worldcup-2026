export function ToggleSwitch({ id, label, checked, onChange }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <span className="toggle-switch__label">{label}</span>
      <input
        id={id}
        type="checkbox"
        className="toggle-switch__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        aria-checked={checked}
      />
      <span className="toggle-switch__track" aria-hidden="true">
        <span className="toggle-switch__thumb" />
      </span>
    </label>
  );
}
