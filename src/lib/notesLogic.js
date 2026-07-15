// Pure helpers for the notes push/adjudication flow. Kept dependency-light and
// side-effect-free so they can be unit-tested without React or the network.

import { anchorFor, shiftPeriod } from './reviewDates'
import { toISODate, minutesToTime } from './dateUtils'
import { newId } from './id'

export const LOCATION_LABEL = {
  inbox: 'Inbox',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  calendar: 'Google Calendar',
}

export function shortText(t, n = 32) {
  const s = (t || '').trim()
  return s.length > n ? s.slice(0, n) + '…' : s
}

// Calendar title/description from a note: short notes become the title outright;
// long notes use their first handful of words as the title and the full text as notes.
export function titleFromNote(text) {
  const t = (text || '').trim()
  if (t.length <= 42) return { title: t || 'Untitled', notes: '' }
  const words = t.split(/\s+/).slice(0, 6).join(' ')
  return { title: words + '…', notes: t }
}

// The review period a push should target. Pushing to the same review type you're
// already in advances to the next occurrence (carry-forward); everything else
// targets the current period for that type.
export function computeTargetPeriod(type, currentType, currentPeriodISO) {
  let base = anchorFor(type, new Date())
  if (currentType && type === currentType && toISODate(base) === currentPeriodISO) {
    base = shiftPeriod(type, base, 1)
  }
  return toISODate(base)
}

// A 30-min slot at the current clock time, snapped to 15 min and clamped into
// the visible day window (6:00–22:00).
export function nowEventSlot() {
  const now = new Date()
  // Snap to the calendar's selected granularity (default 30) so a spawned event
  // locks to :00/:30 rather than an odd :15.
  let step = 30
  try {
    const v = Number(localStorage.getItem('lifeflow.cal.granularity'))
    if (v === 15 || v === 30 || v === 60) step = v
  } catch {
    // ignore
  }
  let mins = now.getHours() * 60 + now.getMinutes()
  mins = Math.round(mins / step) * step
  mins = Math.min(Math.max(mins, 0), 24 * 60 - 30)
  return { date: toISODate(now), start: minutesToTime(mins), end: minutesToTime(mins + 30) }
}

export function buildEventFromNote(text) {
  const { title, notes } = titleFromNote(text)
  const slot = nowEventSlot()
  return {
    id: newId(),
    date: slot.date,
    start_time: slot.start,
    end_time: slot.end,
    duration_min: 30,
    title,
    notes,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_end: '',
    recurrence_count: '',
    is_exception: false,
    exception_of_id: '',
    exception_date: '',
    is_cancelled: false,
  }
}
