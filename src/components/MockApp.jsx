import { useMemo, useState } from 'react'
import { StoreProvider } from '../context/store'
import CalendarMock from './CalendarMock'
import NotesView from './NotesView'
import ReviewsView from './ReviewsView'
import HistoryView from './HistoryView'

// In-memory persistence for the offline harness (no sign-in, no network).
function makeMemPersistence() {
  let notes = []
  let events = []
  let rn = 1
  const clone = (o) => JSON.parse(JSON.stringify(o))
  return {
    listNotes: async () => notes.map(clone),
    createNote: async (n) => {
      const row = { ...n, rowNumber: rn++ }
      notes.push(row)
      return clone(row)
    },
    updateNote: async (n) => {
      const i = notes.findIndex((x) => x.id === n.id)
      if (i >= 0) notes[i] = { ...n }
    },
    removeNote: async (rowNumber) => {
      notes = notes.filter((x) => x.rowNumber !== rowNumber)
    },
    openCalendarLink: (ev) => {
      // Record instead of actually opening a real Google Calendar tab, so the
      // offline harness stays deterministic and inspectable via _debug().
      events.push({ ...ev })
    },
    _debug: () => ({ notes: clone(notes), events: clone(events) }),
  }
}

const TABS = [
  ['notes', 'Notes'],
  ['reviews', 'Reviews'],
  ['history', 'History'],
  ['calendar', 'Calendar'],
]

export default function MockApp() {
  const mem = useMemo(makeMemPersistence, [])
  const [tab, setTab] = useState('notes')

  // Expose the in-memory backend for test inspection.
  if (typeof window !== 'undefined') window.__mockPersistence = mem

  return (
    <StoreProvider persistence={mem}>
      <div className="h-screen flex flex-col bg-paper">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-ink-100">
          <span className="text-xs text-ink-400 mr-2">MOCK</span>
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 h-8 rounded-lg text-sm font-medium ${
                tab === k ? 'bg-ink-800 text-paper' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'notes' && <NotesView />}
          {tab === 'reviews' && <ReviewsView simplified />}
          {tab === 'history' && <HistoryView />}
          {tab === 'calendar' && <CalendarMock />}
        </div>
      </div>
    </StoreProvider>
  )
}
