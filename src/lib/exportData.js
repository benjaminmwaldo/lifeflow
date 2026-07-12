// Export / backup helpers. Reads every tab and packages it as a JSON backup or
// per-table CSV. The Google Sheet is itself the live backup; this is for taking
// data out of the system (portability, archiving, moving off the app).

import * as sheetsApi from './sheetsApi'
import { notesTable, journalTable, goalsTable, reviewsTable } from './tables'

const stripRowNumber = (rows) => rows.map(({ rowNumber, ...rest }) => rest)

export async function gatherAll() {
  const [events, notes, journal, goals, reviews] = await Promise.all([
    sheetsApi.listEvents(),
    notesTable.list(),
    journalTable.list(),
    goalsTable.list(),
    reviewsTable.list(),
  ])
  return {
    exportedAt: new Date().toISOString(),
    events: stripRowNumber(events),
    notes: stripRowNumber(notes),
    journal: stripRowNumber(journal),
    goals: stripRowNumber(goals),
    reviews: stripRowNumber(reviews),
  }
}

export const TABLES = {
  events: { columns: sheetsApi.COLUMNS, list: () => sheetsApi.listEvents() },
  notes: { columns: notesTable.columns, list: () => notesTable.list() },
  journal: { columns: journalTable.columns, list: () => journalTable.list() },
  goals: { columns: goalsTable.columns, list: () => goalsTable.list() },
  reviews: { columns: reviewsTable.columns, list: () => reviewsTable.list() },
}

function csvCell(v) {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(columns, rows) {
  const header = columns.map(csvCell).join(',')
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(',')).join('\n')
  return `${header}\n${body}`
}

export function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function todayStamp() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
