import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { notesTable } from '../lib/tables'
import { newId } from '../lib/id'
import * as sheetsApi from '../lib/sheetsApi'
import { toISODate, minutesToTime } from '../lib/dateUtils'

// Ideas/notes capture. Each note can be pinned to a Sunday review bucket (the
// Reviews module reads these) or to the calendar — pinning to the calendar
// creates a real 30-min event you can then drag to the right slot.
const PIN_OPTIONS = [
  { value: '', label: 'Unpinned' },
  { value: 'calendar', label: '→ Calendar' },
  { value: 'weekly', label: '→ Weekly review' },
  { value: 'monthly', label: '→ Monthly review' },
  { value: 'quarterly', label: '→ Quarterly review' },
  { value: 'yearly', label: '→ Yearly review' },
]

const PIN_BADGE = {
  calendar: 'Calendar',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

// A 30-min slot starting at the next half hour today (drag it afterwards).
function nextSlotToday() {
  const now = new Date()
  let mins = now.getHours() * 60 + now.getMinutes()
  mins = Math.ceil(mins / 30) * 30 + 30 // next half-hour boundary, then +30 for headroom
  if (mins > 22 * 60) mins = 9 * 60 // if it's late, park it at 9am
  return { date: toISODate(now), start: minutesToTime(mins), end: minutesToTime(mins + 30) }
}

export default function NotesView() {
  const notes = useTable(notesTable)
  const [draft, setDraft] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editText, setEditText] = useState('')

  const sorted = [...notes.rows].sort((a, b) => (b.created || '').localeCompare(a.created || ''))

  function addNote() {
    const text = draft.trim()
    if (!text) return
    notes.add({ id: newId(), created: new Date().toISOString(), text, pinned_to: '', linked_event_id: '' })
    setDraft('')
  }

  function startEdit(note) {
    setEditingRow(note.rowNumber)
    setEditText(note.text)
  }

  function saveEdit(note) {
    const text = editText.trim()
    if (text && text !== note.text) notes.update({ ...note, text })
    setEditingRow(null)
  }

  // Changing the pin. Pinning to the calendar also creates a real event.
  function changePin(note, value) {
    if (value === 'calendar' && !note.linked_event_id) {
      const slot = nextSlotToday()
      const eventId = newId()
      const event = {
        id: eventId,
        date: slot.date,
        start_time: slot.start,
        end_time: slot.end,
        duration_min: '',
        title: note.text,
        notes: '',
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_end: '',
        recurrence_count: '',
        is_exception: false,
        exception_of_id: '',
        exception_date: '',
        is_cancelled: false,
      }
      notes.update({ ...note, pinned_to: 'calendar', linked_event_id: eventId })
      sheetsApi
        .createEvent(event)
        .catch((e) => notes.setError('Pinned, but creating the calendar event failed: ' + (e.message || e)))
    } else {
      notes.update({ ...note, pinned_to: value })
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Notes &amp; Ideas</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Capture an idea, then pin it to your calendar or a Sunday review.
          </p>
        </header>

        <div className="flex gap-2 mb-5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNote()
            }}
            placeholder="What's the idea?"
            className="flex-1 px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
          />
          <button
            onClick={addNote}
            disabled={!draft.trim()}
            className="px-4 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
          >
            Add
          </button>
        </div>

        {notes.error && (
          <div className="mb-3 text-xs text-rose-500 flex items-center gap-2">
            <span className="flex-1">{notes.error}</span>
            <button onClick={() => notes.setError(null)} className="text-ink-400 hover:text-ink-600">
              Dismiss
            </button>
          </div>
        )}

        {notes.loading ? (
          <div className="text-sm text-ink-400 py-8 text-center">Loading notes…</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-ink-300 py-12 text-center border border-dashed border-ink-200 rounded-xl">
            No notes yet. Capture your first idea above.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((note) => (
              <li
                key={note.rowNumber}
                className="group bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-3 animate-pop-in"
              >
                <div className="flex items-start gap-2">
                  {editingRow === note.rowNumber ? (
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => saveEdit(note)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          saveEdit(note)
                        }
                        if (e.key === 'Escape') setEditingRow(null)
                      }}
                      rows={2}
                      className="flex-1 resize-none px-2 py-1 rounded-lg border border-moss-400 focus:outline-none text-ink-800 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(note)}
                      className="flex-1 text-left text-ink-800 text-sm leading-relaxed whitespace-pre-wrap"
                      title="Click to edit"
                    >
                      {note.text}
                    </button>
                  )}
                  <button
                    onClick={() => notes.remove(note.rowNumber)}
                    className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-rose-500 transition-opacity text-sm leading-none mt-0.5"
                    aria-label="Delete note"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {note.pinned_to && PIN_BADGE[note.pinned_to] && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-moss-50 text-moss-600">
                      Pinned · {PIN_BADGE[note.pinned_to]}
                    </span>
                  )}
                  <div className="flex-1" />
                  <select
                    value={note.pinned_to || ''}
                    onChange={(e) => changePin(note, e.target.value)}
                    className="text-xs text-ink-500 bg-transparent border border-ink-100 rounded-lg px-2 h-7 focus:outline-none focus:border-moss-400"
                  >
                    {PIN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
