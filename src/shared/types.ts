export interface KeywordGroup {
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  createdAt: number
}

export interface StorageData {
  version: number
  groups: KeywordGroup[]
}