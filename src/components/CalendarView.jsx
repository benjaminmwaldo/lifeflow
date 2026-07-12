import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import Toolbar from './Toolbar'
import CalendarGrid from './CalendarGrid'
import { startOfWeek } from '../lib/dateUtils'

// The calendar module, extracted from the old App root so it can live as one
// tab among several. Behavior is unchanged from the standalone calendar.
export default function CalendarView() {
  const [granularity, setGranularity] = useState(30)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const events = useEvents()

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        embedded
        weekStart={weekStart}
        setWeekStart={setWeekStart}
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
            weekStart={weekStart}
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
