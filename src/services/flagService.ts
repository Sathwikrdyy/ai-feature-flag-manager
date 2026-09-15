import { seedFlags } from '../data'
import type { FeatureFlag, NewFeatureFlag } from '../types'

const STORAGE_KEY = 'ai-flag-manager.flags.v1'

const makeRequestId = () => `ff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const readFlags = (): FeatureFlag[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return seedFlags
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as FeatureFlag[]) : seedFlags
  } catch (error) {
    console.warn(`[flags] read failed (${makeRequestId()})`, error)
    return seedFlags
  }
}

const writeFlags = (flags: FeatureFlag[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch (error) {
    console.error(`[flags] write failed (${makeRequestId()})`, error)
    throw new Error('Your browser could not save this change. Please check storage permissions.')
  }
}

export const flagService = {
  async list(): Promise<FeatureFlag[]> {
    return Promise.resolve(readFlags())
  },

  async setEnabled(id: string, enabled: boolean): Promise<FeatureFlag> {
    const flags = readFlags()
    const index = flags.findIndex((flag) => flag.id === id)
    if (index === -1) throw new Error('This flag no longer exists. Refresh and try again.')

    const updated = {
      ...flags[index],
      enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: 'You',
    }
    flags[index] = updated
    writeFlags(flags)
    console.info(`[flags] toggle ${makeRequestId()}`, { id, enabled })
    return updated
  },

  async create(input: NewFeatureFlag): Promise<FeatureFlag> {
    const flags = readFlags()
    if (flags.some((flag) => flag.key === input.key)) {
      throw new Error('A flag with this key already exists.')
    }
    const created: FeatureFlag = {
      ...input,
      id: `flag-${crypto.randomUUID?.() ?? makeRequestId()}`,
      updatedAt: new Date().toISOString(),
      updatedBy: 'You',
    }
    writeFlags([created, ...flags])
    console.info(`[flags] create ${makeRequestId()}`, { id: created.id })
    return created
  },
}
