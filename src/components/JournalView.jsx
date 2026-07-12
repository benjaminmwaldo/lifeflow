import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { journalTable } from '../lib/tables'
import { addDays, fromISODate, toISODate } from '../lib/dateUtils'

// Daily journal + self-liking (mirrors his DJ F22+ columns). One row per date,
// in a fresh Journal tab (his historical journal is left untouched).
export default function JournalView() {
  const journal = useTable(journalTable)
  const [date, setDate] = useState(() => toISODate(new Date()))
  const existing = journal.rows.find((r) => r.date === date)

  const [entry, setEntry] = useState('')
  const [selfLiking, setSelfLiking] = useState('')
  const [mood, setMood] = useState('')
  const [saved, setSaved] = useState(false)

  // Repopulate the fields whenever the selected day (or loaded data) changes.
  useEffect(() => {
    setEntry(existing?.entry || '')
    setSelfLiking(existing?.self_liking || '')
    setMood(existing?.mood || '')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.rowNumber, journal.loading])

  const dirty =
    entry !== (existing?.entry || '') ||
    selfLiking !== (existing?.self_liking || '') ||
    mood !== (existing?.mood || '')

  function save() {
    if (existing) {
      journal.update({ ...existing, entry, self_liking: selfLiking, mood })
    } else {
      journal.add({ date, entry, self_liking: selfLiking, mood })
    }
    setSaved(true)
  }

  const isToday = date === toISODate(new Date())
  const label = fromISODate(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="flex items-center gap-2 mb-5">
          <div>
            <h2 className="font-display text-2xl text-ink-800">Journal</h2>
            <p className="text-sm text-ink-400 mt-0.5">{label}{isToday ? ' · Today' : ''}</p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDate(toISODate(addDays(fromISODate(date), -1)))}
              className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              onClick={() => setDate(toISODate(new Date()))}
              className="px-3 h-8 rounded-lg hover:bg-ink-100 text-ink-600 text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDate(toISODate(addDays(fromISODate(date), 1)))}
              className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
              aria-label="Next day"
            >
              ›
            </button>
          </div>
        </header>

        {journal.error && (
          <div className="mb-3 text-xs text-rose-500 flex items-center gap-2">
            <span className="flex-1">{journal.error}</span>
            <button onClick={() => journal.setError(null)} className="text-ink-400 hover:text-ink-600">
              Dismiss
            </button>
          </div>
        )}

        <label className="block text-xs font-medium text-ink-500 mb-1.5">Journal</label>
        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="How did the day go?"
          rows={10}
          className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        />

        <label className="block text-xs font-medium text-ink-500 mb-1.5 mt-4">Self-liking</label>
        <textarea
          value={selfLiking}
          onChange={(e) => setSelfLiking(e.target.value)}
          placeholder="What do you like about yourself today?"
          rows={5}
          className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        />

        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Mood</label>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="A word or two"
              className="w-full px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
            />
          </div>
          <div className="flex flex-col items-end pt-6">
            <button
              onClick={save}
              disabled={!dirty}
              className="px-5 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
            >
              Save
            </button>
            {saved && !dirty && <span className="text-xs text-moss-500 mt-1">Saved</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
