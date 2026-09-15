import type { NewFeatureFlag, ValidationErrors } from './types'

export const validateFlag = (input: NewFeatureFlag, existingKeys: string[]): ValidationErrors => {
  const errors: ValidationErrors = {}
  if (!input.key.trim()) errors.key = 'Add a key for this flag.'
  else if (!/^[a-z][a-z0-9_]*$/.test(input.key)) errors.key = 'Use lowercase letters, numbers, and underscores.'
  else if (existingKeys.includes(input.key)) errors.key = 'That key is already in use.'
  if (!input.name.trim()) errors.name = 'Add a name for this flag.'
  if (!input.description.trim()) errors.description = 'Add a short description.'
  return errors
}

export const formatUpdatedAt = (date: string) => {
  const value = new Date(date)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(value)
}

export const formatUpdatedTime = (date: string) => {
  const value = new Date(date)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(value)
}
