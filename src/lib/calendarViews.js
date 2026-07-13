import { startOfWeek, addDays } from './dateUtils'

// Selectable calendar spans.
export const VIEW_MODES = [
  { key: 'week', label: 'Week', count: 7 },
  { key: 'workweek', label: 'Work week', count: 5 },
  { key: '4day', label: '4 days', count: 4 },
  { key: '3day', label: '3 days', count: 3 },
  { key: '2day', label: '2 days', count: 2 },
]

// The visible day columns for a mode, given an anchor Date.
// week = Sun–Sat of the anchor's week; workweek = Mon–Fri; N-day = anchor..anchor+N-1.
export function computeDays(mode, anchor) {
  if (mode === 'week') {
    const s = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }
  if (mode === 'workweek') {
    const mon = addDays(startOfWeek(anchor), 1)
    return Array.from({ length: 5 }, (_, i) => addDays(mon, i))
  }
  const n = mode === '4day' ? 4 : mode === '3day' ? 3 : 2
  return Array.from({ length: n }, (_, i) => addDays(anchor, i))
}

// How far prev/next moves the anchor.
export function navStep(mode) {
  if (mode === 'week' || mode === 'workweek') return 7
  return mode === '4day' ? 4 : mode === '3day' ? 3 : 2
}

export const defaultMode = () =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? '3day' : 'week'
