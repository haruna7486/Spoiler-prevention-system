export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().trim()
}

export function matchesKeyword(title: string, keywords: string[]): boolean {
  const normalizedTitle = normalize(title)
  return keywords.some((kw) => normalizedTitle.includes(normalize(kw)))
}