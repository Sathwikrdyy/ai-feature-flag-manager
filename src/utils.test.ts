import { describe, expect, it } from 'vitest'
import { validateFlag } from './utils'

const valid = { key: 'ai_search', name: 'AI Search', description: 'Searches documents.', type: 'release' as const, enabled: false }

describe('validateFlag', () => {
  it('accepts a valid new flag', () => expect(validateFlag(valid, [])).toEqual({}))
  it('rejects invalid keys and duplicate keys', () => {
    expect(validateFlag({ ...valid, key: 'AI Search' }, [])).toHaveProperty('key')
    expect(validateFlag(valid, ['ai_search'])).toHaveProperty('key')
  })
  it('requires the user-facing fields', () => {
    const errors = validateFlag({ ...valid, name: '', description: '' }, [])
    expect(errors).toMatchObject({ name: expect.any(String), description: expect.any(String) })
  })
})
