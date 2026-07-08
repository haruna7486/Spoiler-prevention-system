import { isSpoiler } from '../../core/matcher'
import { TITLE, CARD_ROOT, THUMBNAIL_IMG, SEARCH_CARD, SEARCH_TITLE, SEARCH_THUMBNAIL, SHORTS_TITLE, SHORTS_THUMBNAIL, SHORTS_SHELF } from './selectors'

const HIDDEN_ATTR = 'data-sp-hidden'
const OVERLAY_ATTR = 'data-sp-overlay'
const BLUR_ATTR = 'data-sp-blurred'
const PLACEHOLDER_TEXT = '［ネタバレ防止中］'
const WATCH_LINK_SELECTOR = 'a[href*="/watch?v="]'

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
      z-index: 2147483647 !important;
      pointer-events: none !important;
    }
    [${BLUR_ATTR}] {
      filter: blur(24px) !important;
      opacity: 0.4 !important;
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

// video-id 以外の判定材料に依存しないサムネイル判定（i.ytimg.com/vi/ 配下は実サムネイルのみ）
function isRealThumbnailImg(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src || img.getAttribute('src') || ''
  const srcset = img.getAttribute('srcset') || ''
  return /ytimg\.com\/vi/.test(src) || /ytimg\.com\/vi/.test(srcset)
}

// コンテナ内から「本物のサムネイル画像」を探す。見つからなければ最初の img にフォールバック
function findThumbnailImg(container: Element): HTMLImageElement | null {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'))
  return imgs.find(isRealThumbnailImg) ?? imgs[0] ?? null
}

function applyThumbOverlay(img: HTMLImageElement): void {
  const container = (
    img.closest('ytd-thumbnail') ??
    img.closest('yt-image') ??
    findSizedAncestor(img)
  ) as HTMLElement | null
  if (!container) return

  // 重ねるdivだけでなく、実ピクセル自体もぼかす（プレビュー再生・video要素の重なり対策）
  container.querySelectorAll<HTMLElement>('img, video').forEach((el) => {
    el.setAttribute(BLUR_ATTR, 'true')
  })

  if (container.querySelector(`[${OVERLAY_ATTR}]`)) return
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
    if (overlay) {
      overlay.remove()
      current.querySelectorAll<HTMLElement>(`[${BLUR_ATTR}]`).forEach((el) => el.removeAttribute(BLUR_ATTR))
      break
    }
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
    const img = (card ? findThumbnailImg(card) : null) ?? card?.querySelector<HTMLImageElement>(THUMBNAIL_IMG) ?? null
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
    const img = findThumbnailImg(card) ?? card.querySelector<HTMLImageElement>(SEARCH_THUMBNAIL) ?? null
    if (!titleEl) return
    const original = titleEl.getAttribute('data-sp-original') ?? titleEl.textContent ?? ''
    if (isSpoiler(original, activeKeywords)) {
      applyBlock(titleEl, img)
    } else {
      removeBlock(titleEl, img)
    }
  })
}

export function processShorts(activeKeywords: string[]): void {
  // 「ショート」の棚の中だけを対象にする（通常動画との二重処理を防ぐ）
  document.querySelectorAll<HTMLElement>(SHORTS_SHELF).forEach((shelf) => {
    shelf.querySelectorAll<HTMLAnchorElement>(SHORTS_TITLE).forEach((titleEl) => {
      const card = titleEl.closest<HTMLElement>('.ytLockupViewModelHost')
      const img = card?.querySelector<HTMLImageElement>(SHORTS_THUMBNAIL) ?? null

      const original = titleEl.getAttribute('data-sp-original') ?? titleEl.textContent ?? ''
      if (isSpoiler(original, activeKeywords)) {
        applyBlock(titleEl, img)
      } else {
        removeBlock(titleEl, img)
      }
    })
  })
}

function extractVideoId(href: string): string | null {
  const match = href.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

// カード名/クラス名に依存せず、「同じ動画IDへのリンクだけを含む最大の祖先要素」を
// カードの境界として扱う。特集棚など未知のマークアップでも動画単位の境界を検出できる。
function findCardRoot(link: HTMLAnchorElement): HTMLElement | null {
  const videoId = extractVideoId(link.getAttribute('href') ?? '')
  let current: HTMLElement | null = link.parentElement
  let best: HTMLElement | null = null
  let depth = 0
  while (current && current !== document.body && depth < 15) {
    const hasOtherVideo = Array.from(current.querySelectorAll<HTMLAnchorElement>(WATCH_LINK_SELECTOR)).some(
      (a) => extractVideoId(a.getAttribute('href') ?? '') !== videoId,
    )
    if (hasOtherVideo) break
    const rect = current.getBoundingClientRect()
    if (rect.width > 80 && rect.height >= 50) best = current
    current = current.parentElement
    depth++
  }
  return best
}

function findTitleEl(card: HTMLElement, link: HTMLAnchorElement): HTMLElement | null {
  return (
    card.querySelector<HTMLElement>(TITLE) ??
    card.querySelector<HTMLElement>(SEARCH_TITLE) ??
    card.querySelector<HTMLElement>('#video-title') ??
    card.querySelector<HTMLElement>('h3 a, h3 span, h3') ??
    (link.textContent?.trim() ? link : null)
  )
}

// タグ名・クラス名の変化に左右されない汎用パス。
// 「/watch?v= へのリンク」+「i.ytimg.com/vi/ のサムネイル画像」というYouTube共通の構造だけを頼りに、
// ホーム・検索の通常カードでは拾えない特集棚（例: FIFAワールドカップ特集）も判定する。
export function processVideoCards(activeKeywords: string[]): void {
  const links = document.querySelectorAll<HTMLAnchorElement>(WATCH_LINK_SELECTOR)
  const seenCards = new Set<HTMLElement>()

  links.forEach((link) => {
    const card = findCardRoot(link)
    if (!card || seenCards.has(card)) return
    seenCards.add(card)

    const titleEl = findTitleEl(card, link)
    const img = findThumbnailImg(card)
    if (!titleEl && !img) return

    const ariaLabel = link.getAttribute('aria-label') ?? link.getAttribute('title') ?? ''
    const visibleTitle = titleEl ? (titleEl.getAttribute('data-sp-original') ?? titleEl.textContent ?? '') : ''
    const isMatch = isSpoiler(visibleTitle, activeKeywords) || (ariaLabel !== '' && isSpoiler(ariaLabel, activeKeywords))

    if (isMatch) {
      if (titleEl) applyBlock(titleEl, img)
      else if (img) applyThumbOverlay(img)
    } else {
      if (titleEl) removeBlock(titleEl, img)
      else if (img) removeThumbOverlay(img)
    }
  })
}
