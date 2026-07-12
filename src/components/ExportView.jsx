import { useState } from 'react'
import { gatherAll, TABLES, toCsv, triggerDownload, todayStamp } from '../lib/exportData'

const TABLE_LABELS = {
  events: 'Calendar events',
  notes: 'Notes',
  journal: 'Journal',
  goals: 'Goals',
  reviews: 'Reviews',
}

export default function ExportView() {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState('')

  async function exportJson() {
    setBusy('json')
    setError(null)
    setDone('')
    try {
      const data = await gatherAll()
      triggerDownload(`lifeflow-backup-${todayStamp()}.json`, JSON.stringify(data, null, 2), 'application/json')
      setDone('Full backup downloaded.')
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy('')
    }
  }

  async function exportCsv(key) {
    setBusy(key)
    setError(null)
    setDone('')
    try {
      const { columns, list } = TABLES[key]
      const rows = await list()
      triggerDownload(`lifeflow-${key}-${todayStamp()}.csv`, toCsv(columns, rows), 'text/csv')
      setDone(`${TABLE_LABELS[key]} exported.`)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Export &amp; Backup</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Your data lives in your Google Sheet (already synced + backed up). Use this to take a copy out.
          </p>
        </header>

        <div className="bg-white rounded-xl border border-ink-100 shadow-soft p-5 mb-4">
          <h3 className="text-sm font-medium text-ink-800 mb-1">Full backup</h3>
          <p className="text-xs text-ink-400 mb-3">Everything — calendar, notes, journal, goals, reviews — in one JSON file.</p>
          <button
            onClick={exportJson}
            disabled={!!busy}
            className="px-4 h-10 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
          >
            {busy === 'json' ? 'Preparing…' : 'Download JSON backup'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-ink-100 shadow-soft p-5">
          <h3 className="text-sm font-medium text-ink-800 mb-3">Per-table CSV</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TABLES).map((key) => (
              <button
                key={key}
                onClick={() => exportCsv(key)}
                disabled={!!busy}
                className="px-3 h-9 rounded-lg border border-ink-200 text-ink-700 text-sm hover:bg-ink-50 disabled:opacity-40 transition-colors"
              >
                {busy === key ? 'Preparing…' : TABLE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {done && <p className="mt-3 text-xs text-moss-500">{done}</p>}
        {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  )
}
