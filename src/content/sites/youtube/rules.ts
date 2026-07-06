import { isSpoiler } from '../../core/matcher'
import { TITLE, CARD_ROOT, THUMBNAIL_IMG, SEARCH_CARD, SEARCH_TITLE, SEARCH_THUMBNAIL } from './selectors'

const HIDDEN_ATTR = 'data-sp-hidden'
const OVERLAY_ATTR = 'data-sp-overlay'
const PLACEHOLDER_TEXT = '［ネタバレ防止中］'

export function injectStyle(): void {
  if (document.getElementById('sp-style')) return
  const style = document.createElement('style')
  style.id = 'sp-style'
  style.textContent = `
    [${OVERLAY_ATTR}] {
      position: absolute !important;
      inset: 0 !important;
      background: #222 !important;
      color: #aaa !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 14px !important;
      font-family: sans-serif !important;
      z-index: 10 !important;
      pointer-events: none !important;
    }
  `
  document.head.appendChild(style)
}

function findSizedAncestor(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el.parentElement
  while (current && current !== document.body) {
    const rect = current.getBoundingClientRect()
    if (rect.width > 0 && rect.height >= 50) return current
    current = current.parentElement
  }
  return null
}

function applyThumbOverlay(img: HTMLImageElement): void {
  const container = (
    img.closest('ytd-thumbnail') ??
    img.closest('yt-image') ??
    findSizedAncestor(img)
  ) as HTMLElement | null
  if (!container || container.querySelector(`[${OVERLAY_ATTR}]`)) return
  const overlay = document.createElement('div')
  overlay.setAttribute(OVERLAY_ATTR, 'true')
  overlay.textContent = 'ネタバレ防止中'
  container.style.position = 'relative'
  container.appendChild(overlay)
}

function removeThumbOverlay(img: HTMLImageElement): void {
  let current: HTMLElement | null = img.parentElement
  while (current) {
    const overlay = current.querySelector(`[${OVERLAY_ATTR}]`)
    if (overlay) { overlay.remove(); break }
    current = current.parentElement
  }
}

function applyBlock(titleEl: Element, img: HTMLImageElement | null): void {
  const original = titleEl.getAttribute('data-sp-original') ?? titleEl.textContent ?? ''
  if (!titleEl.hasAttribute(HIDDEN_ATTR)) {
    titleEl.setAttribute('data-sp-original', original)
    titleEl.setAttribute(HIDDEN_ATTR, 'true')
    titleEl.textContent = PLACEHOLDER_TEXT
  }
  if (img) applyThumbOverlay(img)
}

function removeBlock(titleEl: Element, img: HTMLImageElement | null): void {
  if (titleEl.hasAttribute(HIDDEN_ATTR)) {
    titleEl.textContent = titleEl.getAttribute('data-sp-original') ?? ''
    titleEl.removeAttribute(HIDDEN_ATTR)
    titleEl.removeAttribute('data-sp-original')
  }
  if (img) removeThumbOverlay(img)
}

export function processTitles(activeKeywords: string[]): void {
  document.querySelectorAll<HTMLAnchorElement>(TITLE).forEach((el) => {
    const original = el.getAttribute('data-sp-original') ?? el.textContent ?? ''
    const card = el.closest(CARD_ROOT)
    const img = card?.querySelector<HTMLImageElement>(THUMBNAIL_IMG) ?? null
    if (isSpoiler(original, activeKeywords)) {
      applyBlock(el, img)
    } else {
      removeBlock(el, img)
    }
  })
}

export function processSearchResults(activeKeywords: string[]): void {
  document.querySelectorAll<HTMLElement>(SEARCH_CARD).forEach((card) => {
    const titleEl = card.querySelector<HTMLElement>(SEARCH_TITLE)
    const img = card.querySelector<HTMLImageElement>(SEARCH_THUMBNAIL) ?? null
    if (!titleEl) return
    const original = titleEl.getAttribute('data-sp-original') ?? titleEl.textContent ?? ''
    if (isSpoiler(original, activeKeywords)) {
      applyBlock(titleEl, img)
    } else {
      removeBlock(titleEl, img)
    }
  })
}
