import type { StorageData } from './types'

export const EMPTY_DATA: StorageData = { version: 1, groups: [] }

export function loadStorageData(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['version', 'groups'], (result) => {
      if (!result.version || !result.groups) {
        resolve(EMPTY_DATA)
        return
      }
      resolve({ version: result.version as number, groups: result.groups as StorageData['groups'] })
    })
  })
}

export function onStorageChanged(callback: (data: StorageData) => void): void {
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== 'local') return
    loadStorageData().then(callback)
  })
}