import { useCallback, useState } from 'react'
import CalendarGrid from './CalendarGrid'
import { startOfWeek, toISODate, timeToMinutes } from '../lib/dateUtils'

// Dev-only in-memory harness for exercising CalendarGrid interactions (drag,
// resize, select, copy/paste, delete, double-click) without Google sign-in.
// Reached at ?mock in the dev server only (gated in App.jsx). Not a real module.
let seq = 1

export default function CalendarMock() {
  const todayISO = toISODate(new Date())
  const [events, setEvents] = useState(() => [
    { id: 'e1', date: todayISO, start_time: '09:00', end_time: '10:00', duration_min: 60, title: 'Morning block', notes: '' },
    { id: 'e2', date: todayISO, start_time: '13:00', end_time: '13:30', duration_min: 30, title: 'Lunch', notes: '' },
  ])
  const [granularity] = useState(30)
  const [weekStart] = useState(() => startOfWeek(new Date()))

  const toInstance = (e) => ({
    instanceKey: `${e.id}::${e.date}`,
    id: e.id,
    rowNumber: e.id,
    isException: false,
    isRecurring: false,
    occurrenceDate: e.date,
    date: e.date,
    start_time: e.start_time,
    end_time: e.end_time,
    duration_min: e.duration_min,
    title: e.title,
    notes: e.notes,
  })

  const getInstancesForRange = useCallback(
    (start, end) => {
      const s = toISODate(start)
      const en = toISODate(end)
      return events.filter((e) => e.date >= s && e.date <= en).map(toInstance)
    },
    [events]
  )

  const createSingleEvent = useCallback((date, start, end, title) => {
    const id = 'm' + seq++
    const dur = timeToMinutes(end) - timeToMinutes(start)
    setEvents((p) => [...p, { id, date, start_time: start, end_time: end, duration_min: dur, title, notes: '' }])
    return id
  }, [])

  const patch = useCallback((instance, fields) => {
    setEvents((p) => p.map((e) => (e.id === instance.id ? { ...e, ...fields } : e)))
  }, [])

  const deleteInstance = useCallback((instance) => {
    setEvents((p) => p.filter((e) => e.id !== instance.id))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-paper">
      <div className="px-4 py-2 text-xs text-ink-400 border-b border-ink-100">
        MOCK MODE — in-memory, no sign-in. {events.length} events.
      </div>
      <div className="flex-1 min-h-0">
        <CalendarGrid
          weekStart={weekStart}
          granularity={granularity}
          getInstancesForRange={getInstancesForRange}
          createSingleEvent={createSingleEvent}
          updateInstanceFields={patch}
          moveOrResizeInstance={patch}
          deleteInstance={deleteInstance}
        />
      </div>
    </div>
  )
}
