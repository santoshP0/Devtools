import { useLocalStorage } from './storage'
import type { Tool } from './tools'

/**
 * User-defined tool order, stored per category — "All" keeps its own arrangement
 * separate from "Data", "Media", and so on, so rearranging inside one category
 * never disturbs another.
 *
 * Only slugs are stored. Anything not in the saved list (a newly added tool, or
 * one never dragged) keeps its default position at the end, so the arrangement
 * survives tool additions and removals without being rebuilt.
 */
const KEY = 'devtoolbox-tool-order'

type OrderMap = Record<string, string[]>

/** Sort `tools` by a saved slug order; unsaved tools keep default order, at the end. */
export function applyOrder(tools: Tool[], order: string[] | undefined): Tool[] {
  if (!order || order.length === 0) return tools
  const rank = new Map(order.map((slug, i) => [slug, i]))
  return [...tools].sort((a, b) => {
    const ra = rank.get(a.slug), rb = rank.get(b.slug)
    if (ra === undefined && rb === undefined) return 0 // both unsaved: keep default
    if (ra === undefined) return 1
    if (rb === undefined) return -1
    return ra - rb
  })
}

/** Move `from` to the position of `to`, returning the new slug order. */
export function moveSlug(slugs: string[], from: string, to: string): string[] {
  const a = slugs.indexOf(from), b = slugs.indexOf(to)
  if (a === -1 || b === -1 || a === b) return slugs
  const next = [...slugs]
  next.splice(a, 1)
  next.splice(b, 0, from)
  return next
}

export function useToolOrder() {
  const [order, setOrder] = useLocalStorage<OrderMap>(KEY, {})

  /** Apply the saved arrangement for one category. */
  const ordered = (category: string, tools: Tool[]) => applyOrder(tools, order[category])

  /**
   * Drop `from` onto `to` within a category. The full visible list is passed in
   * so the first drag persists the current arrangement, not a sparse one.
   */
  const reorder = (category: string, visible: Tool[], from: string, to: string) => {
    const current = order[category]?.length ? order[category] : visible.map(t => t.slug)
    setOrder({ ...order, [category]: moveSlug(current, from, to) })
  }

  const resetCategory = (category: string) => {
    const next = { ...order }
    delete next[category]
    setOrder(next)
  }

  const hasCustomOrder = (category: string) => Boolean(order[category]?.length)

  return { ordered, reorder, resetCategory, hasCustomOrder }
}
