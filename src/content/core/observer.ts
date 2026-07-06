let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function observeDOM(callback: () => void): void {
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(callback, 200)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}
