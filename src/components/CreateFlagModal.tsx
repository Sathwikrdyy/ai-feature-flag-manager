import { useState } from 'react'
import { Icon } from './Icon'
import type { FeatureFlag, NewFeatureFlag, ValidationErrors } from '../types'
import { validateFlag } from '../utils'

interface CreateFlagModalProps {
  flags: FeatureFlag[]
  onClose: () => void
  onCreate: (input: NewFeatureFlag) => Promise<void>
}

const initialForm: NewFeatureFlag = { key: '', name: '', description: '', type: 'release', enabled: false }

export function CreateFlagModal({ flags, onClose, onCreate }: CreateFlagModalProps) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const update = (field: keyof NewFeatureFlag, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = { ...form, key: form.key.trim(), name: form.name.trim(), description: form.description.trim() }
    const nextErrors = validateFlag(normalized, flags.map((flag) => flag.key))
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSubmitting(true)
    try {
      await onCreate(normalized)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not create this flag.')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-flag-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">New configuration</p>
            <h2 id="create-flag-title">Create a feature flag</h2>
            <p className="modal-subtitle">Set up a flag now and decide when to turn it on.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><Icon name="x" /></button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="form-field">
            <label htmlFor="flag-name">Name <span>*</span></label>
            <input id="flag-name" autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. AI Smart Replies" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />
            {errors.name && <p className="field-error" id="name-error">{errors.name}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="flag-key">Key <span>*</span></label>
            <input id="flag-key" value={form.key} onChange={(event) => update('key', event.target.value)} placeholder="e.g. ai_smart_replies" aria-invalid={Boolean(errors.key)} aria-describedby={errors.key ? 'key-error' : 'key-help'} />
            {errors.key ? <p className="field-error" id="key-error">{errors.key}</p> : <p className="field-help" id="key-help">Use lowercase letters, numbers, and underscores.</p>}
          </div>
          <div className="form-field">
            <label htmlFor="flag-description">Description <span>*</span></label>
            <textarea id="flag-description" rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What behavior does this control?" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} />
            {errors.description && <p className="field-error" id="description-error">{errors.description}</p>}
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="flag-type">Type</label>
              <select id="flag-type" value={form.type} onChange={(event) => update('type', event.target.value as NewFeatureFlag['type'])}>
                <option value="release">Release</option>
                <option value="experiment">Experiment</option>
              </select>
            </div>
            <label className="checkbox-label"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} /><span>Enable immediately</span></label>
          </div>
          {submitError && <div className="inline-error" role="alert"><Icon name="alert" size={16} />{submitError}</div>}
          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create flag'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
