export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Returns non-overlapping, case-insensitive literal match offsets. */
export function findLiteralMatches(text: string, query: string): number[] {
  if (!query) return []
  const expression = new RegExp(escapeRegExp(query), 'giu')
  return Array.from(text.matchAll(expression), match => match.index)
}

/** Replaces literal matches; replacement characters such as $ stay literal. */
export function replaceAllLiteral(text: string, query: string, replacement: string): string {
  if (!query) return text
  return text.replace(new RegExp(escapeRegExp(query), 'giu'), () => replacement)
}
