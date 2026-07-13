import { useCallback, useMemo, useState } from 'react'
import CalendarGrid from './CalendarGrid'
import Toolbar from './Toolbar'
import { toISODate, fromISODate, addDays, timeToMinutes } from '../lib/dateUtils'
import { computeDays, navStep } from '../lib/calendarViews'

// Dev-only in-memory harness for exercising CalendarGrid interactions without
// Google sign-in. Reached at ?mock in the dev server only (gated in App.jsx).
let seq = 1

export default function CalendarMock() {
  const todayISO = toISODate(new Date())
  const [events, setEvents] = useState(() => [
    { id: 'e1', date: todayISO, start_time: '09:00', end_time: '10:00', duration_min: 60, title: 'Morning block', notes: '', color: '' },
    { id: 'e2', date: todayISO, start_time: '13:00', end_time: '13:30', duration_min: 30, title: 'Lunch', notes: '', color: '' },
  ])
  const [granularity, setGranularity] = useState(30)
  const [mode, setMode] = useState('week')
  const [anchor, setAnchor] = useState(todayISO)
  const days = useMemo(() => computeDays(mode, fromISODate(anchor)), [mode, anchor])

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
    color: e.color,
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
    setEvents((p) => [...p, { id, date, start_time: start, end_time: end, duration_min: dur, title, notes: '', color: '' }])
    return id
  }, [])

  const patch = useCallback((instance, fields) => {
    setEvents((p) => p.map((e) => (e.id === instance.id ? { ...e, ...fields } : e)))
  }, [])

  const deleteInstance = useCallback((instance) => {
    setEvents((p) => p.filter((e) => e.id !== instance.id))
  }, [])

  const nav = (dir) => setAnchor(toISODate(addDays(fromISODate(anchor), navStep(mode) * dir)))

  return (
    <div className="h-full flex flex-col bg-paper">
      <div className="px-4 py-1.5 text-xs text-ink-400 border-b border-ink-100">
        MOCK — in-memory. {events.length} events, {days.length}-day view.
      </div>
      <Toolbar
        embedded
        days={days}
        mode={mode}
        setMode={setMode}
        onPrev={() => nav(-1)}
        onNext={() => nav(1)}
        onToday={() => setAnchor(toISODate(new Date()))}
        granularity={granularity}
        setGranularity={setGranularity}
      />
      <div className="flex-1 min-h-0">
        <CalendarGrid
          days={days}
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
