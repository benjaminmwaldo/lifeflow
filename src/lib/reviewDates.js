// Period math for the review cadence. Every review is anchored to a Sunday:
// weekly = that Sunday; monthly = first Sunday of the month; quarterly = first
// Sunday of the quarter; yearly = first Sunday of the year.

import { addDays, addMonths, startOfWeek } from './dateUtils'

export const REVIEW_TYPES = ['weekly', 'monthly', 'quarterly', 'yearly']

export function firstSundayOfMonth(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const day = first.getDay() // 0 = Sunday
  const offset = day === 0 ? 0 : 7 - day
  return addDays(first, offset)
}

export function firstSundayOfQuarter(year, monthIndex) {
  const quarterStartMonth = Math.floor(monthIndex / 3) * 3
  return firstSundayOfMonth(year, quarterStartMonth)
}

export function firstSundayOfYear(year) {
  return firstSundayOfMonth(year, 0)
}

/** The Sunday anchor for the period containing `ref`, for the given review type. */
export function anchorFor(type, ref) {
  switch (type) {
    case 'weekly':
      return startOfWeek(ref)
    case 'monthly':
      return firstSundayOfMonth(ref.getFullYear(), ref.getMonth())
    case 'quarterly':
      return firstSundayOfQuarter(ref.getFullYear(), ref.getMonth())
    case 'yearly':
      return firstSundayOfYear(ref.getFullYear())
    default:
      return startOfWeek(ref)
  }
}

/** Moves an anchor to the previous/next period (dir = -1 | +1). */
export function shiftPeriod(type, anchorDate, dir) {
  switch (type) {
    case 'weekly':
      return addDays(anchorDate, 7 * dir)
    case 'monthly': {
      const ref = addMonths(anchorDate, dir)
      return firstSundayOfMonth(ref.getFullYear(), ref.getMonth())
    }
    case 'quarterly': {
      const ref = addMonths(anchorDate, 3 * dir)
      return firstSundayOfQuarter(ref.getFullYear(), ref.getMonth())
    }
    case 'yearly':
      return firstSundayOfYear(anchorDate.getFullYear() + dir)
    default:
      return addDays(anchorDate, 7 * dir)
  }
}

export function periodLabel(type, anchorDate) {
  switch (type) {
    case 'weekly':
      return `Week of ${anchorDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    case 'monthly':
      return anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    case 'quarterly':
      return `Q${Math.floor(anchorDate.getMonth() / 3) + 1} ${anchorDate.getFullYear()}`
    case 'yearly':
      return String(anchorDate.getFullYear())
    default:
      return ''
  }
}

/** Which review types are actually "due" on the given date (all fall on Sundays). */
export function reviewsDueOn(date) {
  if (date.getDay() !== 0) return []
  const due = ['weekly']
  const y = date.getFullYear()
  const m = date.getMonth()
  const iso = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (iso(firstSundayOfMonth(y, m)) === iso(date)) due.push('monthly')
  if (iso(firstSundayOfQuarter(y, m)) === iso(date)) due.push('quarterly')
  if (iso(firstSundayOfYear(y)) === iso(date)) due.push('yearly')
  return due
}
