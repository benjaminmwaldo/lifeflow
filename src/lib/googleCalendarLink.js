// Pushes a note to Google Calendar via its public "TEMPLATE" compose link
// (https://calendar.google.com/calendar/render?action=TEMPLATE&...) instead of
// the Calendar API. No OAuth scope, no API enablement, no quota/cost — it just
// opens Google Calendar's own "add event" screen prefilled, and the user
// reviews and saves it themselves. Trade-off: the app has no event id to
// track, so it can't programmatically delete/undo the calendar side of a push
// (only the local note can be restored).

function two(n) {
  return String(n).padStart(2, '0')
}

// 'YYYY-MM-DD' + 'HH:MM' -> 'YYYYMMDDTHHMMSS' (no trailing Z: interpreted in
// the `ctz` timezone passed alongside, per Google's template link format).
function toTemplateDateTime(date, time) {
  const [y, m, d] = date.split('-')
  const [h, min] = time.split(':')
  return `${y}${two(m)}${two(d)}T${two(h)}${two(min)}00`
}

export function buildGoogleCalendarLink({ title, notes, date, start_time, end_time }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Untitled',
    dates: `${toTemplateDateTime(date, start_time)}/${toTemplateDateTime(date, end_time)}`,
    details: notes || '',
    ctz: timeZone,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Opens Google Calendar's prefilled "add event" screen in a new tab. Must be
 * called synchronously from a user-gesture handler (no `await` before it) or
 * browsers will block the popup.
 */
export function openCalendarLink(ev) {
  window.open(buildGoogleCalendarLink(ev), '_blank', 'noopener,noreferrer')
}
