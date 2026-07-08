import { loadStorageData, onStorageChanged } from '../shared/storage'
import { getActiveKeywords } from './core/matcher'
import { observeDOM } from './core/observer'
import { processTitles, processSearchResults, processShorts, processVideoCards, injectStyle } from './sites/youtube/rules'
import type { StorageData } from '../shared/types'

let activeKeywords: string[] = []

function applyRules(): void {
  processTitles(activeKeywords)
  processSearchResults(activeKeywords)
  processVideoCards(activeKeywords)
  processShorts(activeKeywords)
}

async function init() {
  injectStyle()
  const data = await loadStorageData()
  activeKeywords = getActiveKeywords(data)
  console.info('[spoiler-prevention] loaded', { activeKeywords })
  applyRules()
  observeDOM(applyRules)
}

onStorageChanged((data: StorageData) => {
  activeKeywords = getActiveKeywords(data)
  console.info('[spoiler-prevention] keywords updated', { activeKeywords })
  applyRules()
})

init()
