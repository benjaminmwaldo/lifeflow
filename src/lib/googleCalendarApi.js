// Thin wrapper around the Google Calendar API v3 REST endpoints. Used to push
// notes onto the signed-in user's real primary Google Calendar (as opposed to
// the app's own Sheets-backed calendar, which sheetsApi.js manages).

import { ensureAccessToken } from './googleAuth'

const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = await ensureAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Calendar API ${method} ${path} failed: ${res.status} ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

/**
 * Creates an event on the signed-in user's primary Google Calendar.
 * Returns the created event resource (its `.id` is Google's own event id,
 * needed later to delete it).
 */
export async function createEvent({ title, notes, date, start_time, end_time }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const body = {
    summary: title || 'Untitled',
    description: notes || '',
    start: { dateTime: `${date}T${start_time}:00`, timeZone },
    end: { dateTime: `${date}T${end_time}:00`, timeZone },
  }
  return apiFetch('', { method: 'POST', body })
}

/** Deletes an event from the primary calendar by its Google-assigned event id. */
export async function deleteEvent(eventId) {
  if (!eventId) return
  await apiFetch(`/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}
