// Simplified recurrence engine (not RFC 5545). Given a master event row and a
// visible date range, returns the set of occurrence dates that fall in range.
// Individual occurrences are NOT materialized as sheet rows — only edited or
// deleted occurrences become "exception" rows, applied on top in useEvents.js.

import { addDays, addMonths, fromISODate, toISODate } from './dateUtils'

/**
 * @param {object} master - event row with recurrence_type/interval/end fields
 * @param {Date} rangeStart - inclusive
 * @param {Date} rangeEnd - inclusive
 * @returns {string[]} ISO date strings of occurrences within range
 */
export function expandOccurrences(master, rangeStart, rangeEnd) {
  const type = master.recurrence_type || 'none'
  const anchor = fromISODate(master.date)
  const interval = Math.max(1, Number(master.recurrence_interval) || 1)
  const endDate = master.recurrence_end ? fromISODate(master.recurrence_end) : null
  const count = master.recurrence_count ? Number(master.recurrence_count) : null

  if (type === 'none') {
    const d = anchor
    if (d >= startOfDay(rangeStart) && d <= endOfDay(rangeEnd)) return [toISODate(d)]
    return []
  }

  const results = []
  let current = anchor
  let occurrenceIndex = 0
  // Safety cap so a malformed row (e.g. daily with no end) can't hang the UI.
  const MAX_ITER = 5000

  for (let i = 0; i < MAX_ITER; i++) {
    if (endDate && current > endDate) break
    if (count && occurrenceIndex >= count) break
    if (current > endOfDay(rangeEnd)) break

    if (current >= startOfDay(rangeStart)) {
      results.push(toISODate(current))
    }
    occurrenceIndex += 1

    if (type === 'daily') current = addDays(current, interval)
    else if (type === 'weekly') current = addDays(current, 7 * interval)
    else if (type === 'monthly') current = addMonths(current, interval)
    else break
  }

  return results
}

function startOfDay(d) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}
function endOfDay(d) {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c
}

export function recurrenceSummary(event) {
  const type = event.recurrence_type
  if (!type || type === 'none') return null
  const n = Number(event.recurrence_interval) || 1
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[type]
  const every = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`
  if (event.recurrence_count) return `${every}, ${event.recurrence_count} times`
  if (event.recurrence_end) return `${every}, until ${event.recurrence_end}`
  return every
}
