// Thin wrapper around the Google Sheets API v4 REST endpoints. All calls use
// the bearer token obtained via googleAuth.js — no server, no service account.

import { ensureAccessToken } from './googleAuth'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const TAB_NAME = import.meta.env.VITE_SHEET_TAB_NAME || 'Events'
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// Column order — must match the header row written to the sheet.
export const COLUMNS = [
  'id',
  'date', // YYYY-MM-DD (anchor date for recurring events)
  'start_time', // HH:MM 24h
  'end_time', // HH:MM 24h
  'duration_min',
  'title',
  'notes',
  'recurrence_type', // none | daily | weekly | monthly
  'recurrence_interval', // integer N
  'recurrence_end', // YYYY-MM-DD or '' when using count
  'recurrence_count', // integer or '' when using end date
  'is_exception', // TRUE/FALSE
  'exception_of_id', // id of the master recurring event this overrides
  'exception_date', // the specific occurrence date this exception replaces (YYYY-MM-DD)
  'is_cancelled', // TRUE/FALSE — exception that deletes a single occurrence
]

let sheetMetaCache = null

async function apiFetch(path, { method = 'GET', body, params } = {}) {
  const token = await ensureAccessToken()
  const url = new URL(`${BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Sheets API ${method} ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

/** Reads spreadsheet metadata and finds/creates the Events tab. Cached in-memory. */
export async function getSheetMeta({ force = false } = {}) {
  if (sheetMetaCache && !force) return sheetMetaCache

  const meta = await apiFetch(`/${SHEET_ID}`, { params: { fields: 'sheets.properties' } })
  let tab = meta.sheets?.find((s) => s.properties.title === TAB_NAME)

  if (!tab) {
    const created = await apiFetch(`/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: {
        requests: [
          { addSheet: { properties: { title: TAB_NAME } } },
        ],
      },
    })
    const props = created.replies[0].addSheet.properties
    tab = { properties: props }
    await apiFetch(`/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A1`, {
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      body: { values: [COLUMNS] },
    })
  } else {
    // Make sure header row exists / is up to date on first read.
    const headerRes = await apiFetch(
      `/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A1:O1`
    )
    const existingHeader = headerRes.values?.[0] || []
    if (existingHeader.length === 0) {
      await apiFetch(`/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A1`, {
        method: 'PUT',
        params: { valueInputOption: 'RAW' },
        body: { values: [COLUMNS] },
      })
    }
  }

  sheetMetaCache = { sheetId: tab.properties.sheetId, title: tab.properties.title }
  return sheetMetaCache
}

function rowToEvent(row, rowNumber) {
  const obj = { rowNumber }
  COLUMNS.forEach((col, i) => {
    obj[col] = row[i] ?? ''
  })
  obj.is_exception = obj.is_exception === 'TRUE' || obj.is_exception === true
  obj.is_cancelled = obj.is_cancelled === 'TRUE' || obj.is_cancelled === true
  obj.recurrence_interval = obj.recurrence_interval ? Number(obj.recurrence_interval) : 1
  obj.recurrence_count = obj.recurrence_count ? Number(obj.recurrence_count) : ''
  obj.duration_min = obj.duration_min ? Number(obj.duration_min) : ''
  return obj
}

function eventToRow(event) {
  return COLUMNS.map((col) => {
    const v = event[col]
    if (v === true) return 'TRUE'
    if (v === false) return 'FALSE'
    if (v === undefined || v === null) return ''
    return String(v)
  })
}

/** Fetches every event/exception row currently in the sheet. */
export async function listEvents() {
  await getSheetMeta()
  const res = await apiFetch(
    `/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A2:O100000`
  )
  const rows = res.values || []
  return rows
    .map((row, i) => rowToEvent(row, i + 2)) // +2: header is row 1, data starts row 2
    .filter((e) => e.id) // skip blank trailing rows
}

/** Appends a new event row. Returns the created event including its rowNumber. */
export async function createEvent(event) {
  await getSheetMeta()
  const values = [eventToRow(event)]
  const res = await apiFetch(
    `/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A2:O2:append`,
    {
      method: 'POST',
      params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
      body: { values },
    }
  )
  // Parse the row number Sheets assigned from the returned updatedRange, e.g. "Events!A5:O5"
  const range = res.updates?.updatedRange || ''
  const match = range.match(/(\d+):[A-Z]+(\d+)$/) || range.match(/!A(\d+)/)
  const rowNumber = match ? Number(match[1] || match[2]) : undefined
  return { ...event, rowNumber }
}

/** Overwrites an existing row in place (used for edits, moves, resizes). */
export async function updateEvent(event) {
  if (!event.rowNumber) throw new Error('updateEvent requires rowNumber')
  const values = [eventToRow(event)]
  await apiFetch(
    `/${SHEET_ID}/values/${encodeURIComponent(TAB_NAME)}!A${event.rowNumber}:O${event.rowNumber}`,
    {
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      body: { values },
    }
  )
  return event
}

/** Deletes a row entirely (shifts rows below it up). */
export async function deleteEventRow(rowNumber) {
  const { sheetId } = await getSheetMeta()
  await apiFetch(`/${SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  })
}
