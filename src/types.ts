export type FlagType = 'release' | 'experiment'

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  type: FlagType
  enabled: boolean
  updatedAt: string
  updatedBy: string
}

export interface NewFeatureFlag {
  key: string
  name: string
  description: string
  type: FlagType
  enabled: boolean
}

export interface ValidationErrors {
  key?: string
  name?: string
  description?: string
}
