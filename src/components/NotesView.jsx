import { useState } from 'react'
import { useStore } from '../context/store'
import { computeTargetPeriod, LOCATION_LABEL } from '../lib/notesLogic'

const REVIEW_TARGETS = ['weekly', 'monthly', 'quarterly', 'yearly']

export default function NotesView() {
  const store = useStore()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [pushingId, setPushingId] = useState(null)

  const notes = [...store.inboxNotes].sort((a, b) => (b.created || '').localeCompare(a.created || ''))

  function addNote() {
    if (!draft.trim()) return
    store.addNote(draft)
    setDraft('')
  }
  function startEdit(note) {
    setEditingId(note.id)
    setEditText(note.text)
  }
  function saveEdit(note) {
    store.editNoteText(note, editText)
    setEditingId(null)
  }
  function push(note, target) {
    if (target === 'calendar') store.pushToCalendar(note)
    else store.pushToReview(note, target, computeTargetPeriod(target))
    setPushingId(null)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Notes &amp; Ideas</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            An inbox. Capture ideas here; <span className="text-ink-600">push</span> each to your calendar
            or a review when you're ready — pushed notes leave the inbox.
          </p>
        </header>

        <div className="flex gap-2 mb-5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
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

        {store.error && (
          <div className="mb-3 text-xs text-rose-500 flex items-center gap-2">
            <span className="flex-1">{store.error}</span>
            <button onClick={() => store.setError(null)} className="text-ink-400 hover:text-ink-600">
              Dismiss
            </button>
          </div>
        )}

        {store.loading ? (
          <div className="text-sm text-ink-400 py-8 text-center">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-ink-300 py-12 text-center border border-dashed border-ink-200 rounded-xl">
            Inbox empty. Capture an idea above.
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-3 animate-pop-in"
              >
                <div className="flex items-start gap-2">
                  {editingId === note.id ? (
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
                        if (e.key === 'Escape') setEditingId(null)
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
                    onClick={() => store.deleteNote(note)}
                    className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-rose-500 transition-opacity text-sm leading-none mt-0.5"
                    aria-label="Delete note"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2">
                  {pushingId === note.id ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-ink-400 mr-0.5">Push to:</span>
                      <button
                        onClick={() => push(note, 'calendar')}
                        className="px-2.5 h-7 rounded-lg bg-moss-500 text-white text-xs font-medium hover:bg-moss-600"
                      >
                        Calendar
                      </button>
                      {REVIEW_TARGETS.map((t) => (
                        <button
                          key={t}
                          onClick={() => push(note, t)}
                          className="px-2.5 h-7 rounded-lg border border-ink-200 text-ink-700 text-xs hover:bg-ink-50"
                        >
                          {LOCATION_LABEL[t]}
                        </button>
                      ))}
                      <button
                        onClick={() => setPushingId(null)}
                        className="px-2 h-7 rounded-lg text-ink-400 text-xs hover:text-ink-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPushingId(note.id)}
                      className="px-3 h-7 rounded-lg bg-ink-100 text-ink-700 text-xs font-medium hover:bg-ink-200 transition-colors"
                    >
                      Push →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
