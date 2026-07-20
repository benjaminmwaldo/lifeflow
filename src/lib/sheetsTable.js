// Generic, tab-parameterized Google Sheets table. One logical table per tab,
// sharing the same client-side bearer token.

import { ensureAccessToken } from './googleAuth'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

// 1-indexed column number -> spreadsheet column letter (1->A, 27->AA).
function colLetter(n) {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

async function apiFetch(path, { method = 'GET', body, params } = {}) {
  const token = await ensureAccessToken()
  const url = new URL(`${BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Sheets API ${method} ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Creates a table bound to a tab + column list. Returns CRUD helpers.
 * The first column is treated as the row key for blank-row filtering.
 */
export function createTable({ tabName, columns }) {
  const lastCol = colLetter(columns.length)
  const enc = encodeURIComponent(tabName)
  let metaCache = null

  async function ensureTab({ force = false } = {}) {
    if (metaCache && !force) return metaCache
    const meta = await apiFetch(`/${SHEET_ID}`, { params: { fields: 'sheets.properties' } })
    let tab = meta.sheets?.find((s) => s.properties.title === tabName)
    if (!tab) {
      const created = await apiFetch(`/${SHEET_ID}:batchUpdate`, {
        method: 'POST',
        body: { requests: [{ addSheet: { properties: { title: tabName } } }] },
      })
      tab = { properties: created.replies[0].addSheet.properties }
      await apiFetch(`/${SHEET_ID}/values/${enc}!A1`, {
        method: 'PUT',
        params: { valueInputOption: 'RAW' },
        body: { values: [columns] },
      })
    } else {
      const headerRes = await apiFetch(`/${SHEET_ID}/values/${enc}!A1:${lastCol}1`)
      const existing = headerRes.values?.[0] || []
      if (existing.length === 0) {
        await apiFetch(`/${SHEET_ID}/values/${enc}!A1`, {
          method: 'PUT',
          params: { valueInputOption: 'RAW' },
          body: { values: [columns] },
        })
      } else {
        const mismatch = existing.findIndex((value, i) => value !== columns[i])
        if (mismatch !== -1 || existing.length > columns.length) {
          throw new Error(
            `${tabName} header does not match the expected schema at column ${mismatch + 1}. ` +
              'Columns may only be appended; existing columns cannot be reordered.'
          )
        }
        if (existing.length < columns.length) {
          await apiFetch(`/${SHEET_ID}/values/${enc}!A1:${lastCol}1`, {
            method: 'PUT',
            params: { valueInputOption: 'RAW' },
            body: { values: [columns] },
          })
        }
      }
    }
    metaCache = { sheetId: tab.properties.sheetId, title: tab.properties.title }
    return metaCache
  }

  function rowToObj(row, rowNumber) {
    const obj = { rowNumber }
    columns.forEach((c, i) => {
      obj[c] = row[i] ?? ''
    })
    return obj
  }

  function objToRow(obj) {
    return columns.map((c) => {
      const v = obj[c]
      if (v === true) return 'TRUE'
      if (v === false) return 'FALSE'
      if (v === undefined || v === null) return ''
      return String(v)
    })
  }

  async function list() {
    await ensureTab()
    const res = await apiFetch(`/${SHEET_ID}/values/${enc}!A2:${lastCol}100000`)
    const rows = res.values || []
    return rows
      .map((r, i) => rowToObj(r, i + 2)) // header is row 1
      .filter((o) => o[columns[0]] !== '' && o[columns[0]] != null)
  }

  async function create(obj) {
    await ensureTab()
    // Write to an explicit next-empty row at column A rather than values.append.
    // append() does fuzzy "table detection" and, when the schema has empty
    // columns after the key (e.g. Notes' pinned_to/linked_event_id), it can
    // place the new row shifted right. Reading column A gives an unambiguous
    // next row and guarantees column-A alignment.
    const colA = await apiFetch(`/${SHEET_ID}/values/${enc}!A1:A100000`)
    const rowNumber = (colA.values ? colA.values.length : 0) + 1
    await apiFetch(`/${SHEET_ID}/values/${enc}!A${rowNumber}:${lastCol}${rowNumber}`, {
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      body: { values: [objToRow(obj)] },
    })
    return { ...obj, rowNumber }
  }

  async function update(obj) {
    if (!obj.rowNumber) throw new Error('update requires a rowNumber')
    await apiFetch(`/${SHEET_ID}/values/${enc}!A${obj.rowNumber}:${lastCol}${obj.rowNumber}`, {
      method: 'PUT',
      params: { valueInputOption: 'RAW' },
      body: { values: [objToRow(obj)] },
    })
    return obj
  }

  async function remove(rowNumber) {
    const { sheetId } = await ensureTab()
    await apiFetch(`/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
            },
          },
        ],
      },
    })
  }

  return { columns, ensureTab, list, create, update, remove }
}
