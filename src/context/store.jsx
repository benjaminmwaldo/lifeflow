import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { notesTable } from '../lib/tables'
import { openCalendarLink } from '../lib/googleCalendarLink'
import { buildEventFromNote, LOCATION_LABEL, shortText } from '../lib/notesLogic'
import { newId } from '../lib/id'

const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

const normalizeNote = (row) => ({ ...row, location: row.location || 'inbox' })

// Real persistence: notes tab (Sheet). Pushing to "Calendar" opens Google
// Calendar's own prefilled compose link (no API, no OAuth scope, no cost) —
// Benjamin prefers his real Google Calendar over the app's own Sheets-backed
// calendar, and there's no event id/undo-delete to track since the user
// saves the event themselves in the opened tab.
export const realPersistence = {
  listNotes: () => notesTable.list().then((rows) => rows.map(normalizeNote)),
  createNote: (n) => notesTable.create(n),
  updateNote: (n) => notesTable.update(n),
  removeNote: (rowNumber) => notesTable.remove(rowNumber),
  openCalendarLink: (ev) => openCalendarLink(ev),
}

function freshNote(text, location = 'inbox', period = '') {
  return {
    id: newId(),
    created: new Date().toISOString(),
    text,
    pinned_to: '',
    linked_event_id: '',
    location,
    period,
    adjudication: '',
    decision: '',
  }
}

export function StoreProvider({ persistence = realPersistence, children }) {
  const P = persistence
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actions, setActions] = useState([])
  const notesRef = useRef(notes)
  notesRef.current = notes
  const seq = useRef(1)

  const refresh = useCallback(async () => {
    try {
      setNotes(await P.listNotes())
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [P])

  useEffect(() => {
    refresh()
  }, [refresh])

  const byId = (id) => notesRef.current.find((n) => n.id === id)

  // --- low-level ops (optimistic local + persist; create/remove reconcile row numbers) ---
  const doCreate = useCallback(
    async (note) => {
      setNotes((prev) => [...prev, note])
      try {
        await P.createNote(note)
        await refresh()
      } catch (e) {
        setError(e.message || String(e))
        await refresh()
      }
    },
    [P, refresh]
  )

  const doUpdate = useCallback(
    async (id, fields) => {
      const cur = byId(id)
      if (!cur) return
      const next = { ...cur, ...fields }
      setNotes((prev) => prev.map((n) => (n.id === id ? next : n)))
      try {
        await P.updateNote(next)
      } catch (e) {
        setError(e.message || String(e))
        await refresh()
      }
    },
    [P, refresh]
  )

  const doRemove = useCallback(
    async (id) => {
      const cur = byId(id)
      if (!cur) return
      setNotes((prev) => prev.filter((n) => n.id !== id))
      try {
        if (cur.rowNumber) await P.removeNote(cur.rowNumber)
        await refresh()
      } catch (e) {
        setError(e.message || String(e))
        await refresh()
      }
    },
    [P, refresh]
  )

  const record = useCallback((label, undo) => {
    const id = seq.current++
    setActions((prev) => [{ id, label, undone: false, undo }, ...prev])
  }, [])

  // --- high-level actions (logged + undoable) ---
  const addNote = useCallback((text) => {
    const t = text.trim()
    if (!t) return
    doCreate(freshNote(t))
  }, [doCreate])

  const pushToReview = useCallback(
    (note, type, period) => {
      const before = { location: note.location, period: note.period }
      doUpdate(note.id, { location: type, period })
      record(`Pushed “${shortText(note.text)}” → ${LOCATION_LABEL[type]}`, () =>
        doUpdate(note.id, before)
      )
    },
    [doUpdate, record]
  )

  const pushToCalendar = useCallback(
    (note) => {
      const ev = buildEventFromNote(note.text)
      const snap = { ...note }
      // Open synchronously (no await before this) so browsers don't treat it
      // as a blocked popup — must run inside the click's user-gesture window.
      P.openCalendarLink(ev)
      doRemove(note.id)
      record(
        `Pushed “${shortText(note.text)}” → Google Calendar (opened ${ev.start_time}, save it there)`,
        () => doCreate(freshNoteFromSnapshot(snap))
      )
    },
    [P, doRemove, doCreate, record]
  )

  // From a review: keep the note as an adjudicated record and forward a copy.
  const pushOnward = useCallback(
    async (note, target, adjudicationText) => {
      const before = { decision: note.decision || '', adjudication: note.adjudication || '' }
      const adj = adjudicationText != null ? adjudicationText : note.adjudication || ''
      let decisionLabel
      let forwardUndo
      if (target.kind === 'calendar') {
        const ev = buildEventFromNote(note.text)
        P.openCalendarLink(ev)
        decisionLabel = `→ Google Calendar (opened ${ev.start_time}, save it there)`
        forwardUndo = () => {} // nothing to undo on the calendar side — the user saves it themselves
      } else {
        // Carry the review text along with the note into the next review.
        const fwd = { ...freshNote(note.text, target.type, target.period), adjudication: adj }
        await doCreate(fwd)
        decisionLabel = `→ ${LOCATION_LABEL[target.type]}`
        forwardUndo = () => doRemove(fwd.id)
      }
      await doUpdate(note.id, { decision: decisionLabel, adjudication: adj })
      record(`Adjudicated “${shortText(note.text)}” ${decisionLabel}`, async () => {
        await forwardUndo()
        await doUpdate(note.id, before)
      })
    },
    [P, doCreate, doRemove, doUpdate, record]
  )

  const resolveNote = useCallback(
    (note, adjudicationText) => {
      const before = { decision: note.decision || '', adjudication: note.adjudication || '' }
      const adj = adjudicationText != null ? adjudicationText : note.adjudication || ''
      doUpdate(note.id, { decision: 'Resolved', adjudication: adj })
      record(`Resolved “${shortText(note.text)}”`, () => doUpdate(note.id, before))
    },
    [doUpdate, record]
  )

  // Save adjudication text without logging it as an undoable action (it's just editing).
  const saveAdjudication = useCallback(
    (note, text) => {
      if ((note.adjudication || '') === text) return
      doUpdate(note.id, { adjudication: text })
    },
    [doUpdate]
  )

  // Editing a note's text (not logged — trivial edit, not a "push" action).
  const editNoteText = useCallback(
    (note, text) => {
      const t = (text || '').trim()
      if (!t || t === note.text) return
      doUpdate(note.id, { text: t })
    },
    [doUpdate]
  )

  const deleteNote = useCallback(
    (note) => {
      const snap = { ...note }
      doRemove(note.id)
      record(`Deleted “${shortText(note.text)}”`, () => doCreate(freshNoteFromSnapshot(snap)))
    },
    [doRemove, doCreate, record]
  )

  // --- undo ---
  const runUndo = useCallback(
    async (a) => {
      try {
        await a.undo()
        setActions((prev) => prev.map((x) => (x.id === a.id ? { ...x, undone: true } : x)))
      } catch (e) {
        setError(e.message || String(e))
      }
    },
    []
  )
  const undo = useCallback(() => {
    const a = actions.find((x) => !x.undone)
    if (a) runUndo(a)
  }, [actions, runUndo])
  const revertAction = useCallback(
    (id) => {
      const a = actions.find((x) => x.id === id && !x.undone)
      if (a) runUndo(a)
    },
    [actions, runUndo]
  )

  // Ctrl/Cmd+Z (when not typing / in a field).
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const value = {
    notes,
    loading,
    error,
    setError,
    inboxNotes: notes.filter((n) => n.location === 'inbox'),
    notesForReview: (type, period) => notes.filter((n) => n.location === type && n.period === period),
    addNote,
    pushToReview,
    pushToCalendar,
    pushOnward,
    resolveNote,
    saveAdjudication,
    editNoteText,
    deleteNote,
    actions,
    undo,
    revertAction,
    canUndo: actions.some((x) => !x.undone),
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// Re-add a removed note under its original identity/state.
function freshNoteFromSnapshot(snap) {
  return {
    id: snap.id,
    created: snap.created,
    text: snap.text,
    pinned_to: '',
    linked_event_id: '',
    location: snap.location || 'inbox',
    period: snap.period || '',
    adjudication: snap.adjudication || '',
    decision: snap.decision || '',
  }
}
