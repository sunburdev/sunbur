export function NumberField({ label, value, onChange, min, max, unit, step = .1 }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; unit: string; step?: number }) {
  const invalid = !Number.isFinite(value) || value < min || value > max || (step === 1 && !Number.isInteger(value))
  return <label className="tools-field"><span>{label}</span><div className={invalid ? "tools-input invalid" : "tools-input"}><input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={event => onChange(event.target.valueAsNumber)} aria-invalid={invalid} /><small>{unit}</small></div>{invalid && <small className="tools-field-error">От {min} до {max}{step === 1 ? ", целое число" : ""}</small>}</label>
}
