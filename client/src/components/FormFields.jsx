export function Input({ name, label, required = false, full = false, ...props }) {
  return <div className={`field${full ? ' full' : ''}`}>
    <label htmlFor={name}>{label}{required && <span className="required"> *</span>}</label>
    <input id={name} name={name} required={required} {...props} />
  </div>;
}

export function Select({ name, label, values, selected = '', required = false }) {
  return <div className="field">
    <label htmlFor={name}>{label}{required && <span className="required"> *</span>}</label>
    <select id={name} name={name} defaultValue={selected} required={required}>
      <option value="">Select</option>
      {values.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>
  </div>;
}
