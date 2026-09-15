interface ToggleProps {
  checked: boolean
  label: string
  onChange: () => void
}

export function Toggle({ checked, label, onChange }: ToggleProps) {
  return (
    <button className={`toggle ${checked ? 'toggle-on' : ''}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}>
      <span className="toggle-knob" />
    </button>
  )
}
