import { useEffect, useMemo, useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import Toolbar from './Toolbar'
import CalendarGrid from './CalendarGrid'
import { toISODate, fromISODate, addDays } from '../lib/dateUtils'
import { computeDays, navStep, defaultMode } from '../lib/calendarViews'

function readGranularity() {
  const v = Number(localStorage.getItem('lifeflow.cal.granularity'))
  return v === 15 || v === 30 || v === 60 ? v : 30
}

export default function CalendarView() {
  const [granularity, setGranularity] = useState(readGranularity)
  const [mode, setMode] = useState(defaultMode)
  const [anchor, setAnchor] = useState(() => toISODate(new Date()))
  const events = useEvents()

  // Persist granularity so pushed-to-calendar events snap to the same increment.
  useEffect(() => {
    localStorage.setItem('lifeflow.cal.granularity', String(granularity))
  }, [granularity])

  const days = useMemo(() => computeDays(mode, fromISODate(anchor)), [mode, anchor])

  const nav = (dir) => setAnchor(toISODate(addDays(fromISODate(anchor), navStep(mode) * dir)))
  const goToday = () => setAnchor(toISODate(new Date()))

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        embedded
        days={days}
        mode={mode}
        setMode={setMode}
        onPrev={() => nav(-1)}
        onNext={() => nav(1)}
        onToday={goToday}
        granularity={granularity}
        setGranularity={setGranularity}
        syncing={events.syncing}
        error={events.error}
        onDismissError={() => events.setError(null)}
      />
      <div className="flex-1 min-h-0">
        {events.loading ? (
          <div className="h-full flex items-center justify-center text-ink-400 text-sm">
            Loading your calendar…
          </div>
        ) : (
          <CalendarGrid
            days={days}
            granularity={granularity}
            getInstancesForRange={events.getInstancesForRange}
            createSingleEvent={events.createSingleEvent}
            updateInstanceFields={events.updateInstanceFields}
            moveOrResizeInstance={events.moveOrResizeInstance}
            deleteInstance={events.deleteInstance}
          />
        )}
      </div>
    </div>
  )
}
