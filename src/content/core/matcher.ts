import { matchesKeyword } from '../../shared/normalize'
import type { StorageData } from '../../shared/types'

export function getActiveKeywords(data: StorageData): string[] {
  return data.groups
    .filter((g) => g.enabled)
    .flatMap((g) => g.keywords)
}

export function isSpoiler(title: string, activeKeywords: string[]): boolean {
  return matchesKeyword(title, activeKeywords)
}
