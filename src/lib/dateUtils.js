// Small dependency-free date helpers. All dates are treated as local time
// and represented as 'YYYY-MM-DD' strings + separate HH:MM time strings,
// matching the sheet's column layout.

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function addMonths(d, n) {
  const copy = new Date(d)
  const day = copy.getDate()
  copy.setDate(1)
  copy.setMonth(copy.getMonth() + n)
  const lastDay = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate()
  copy.setDate(Math.min(day, lastDay))
  return copy
}

export function startOfWeek(d) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay() // 0 = Sunday
  return addDays(copy, -day)
}

export function isSameDate(a, b) {
  return toISODate(a) === toISODate(b)
}

export function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function formatTimeLabel(t) {
  const mins = timeToMinutes(t)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${pad2(m)} ${period}`
}

export function formatDayLabel(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

export function formatDateLabel(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatWeekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const startStr = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startStr} – ${endStr}`
}
