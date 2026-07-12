import { addDays, formatWeekRangeLabel, startOfWeek } from '../lib/dateUtils'

const GRANULARITIES = [15, 30, 60]

export default function Toolbar({
  weekStart,
  setWeekStart,
  granularity,
  setGranularity,
  syncing,
  error,
  onDismissError,
  onSignOut,
}) {
  return (
    <div className="border-b border-ink-100 bg-paper/95 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-ink-800 flex-shrink-0 flex items-center justify-center">
          <div className="w-4 h-3 rounded-sm bg-paper relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-moss-500 rounded-t-sm" />
          </div>
        </div>
        <h1 className="font-display text-xl text-ink-800 mr-2 hidden sm:block">Calendar</h1>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center transition-colors"
            aria-label="Previous week"
          >
            ‹
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-3 h-8 rounded-lg hover:bg-ink-100 text-ink-600 text-sm font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center transition-colors"
            aria-label="Next week"
          >
            ›
          </button>
        </div>

        <span className="text-sm text-ink-500 font-medium hidden md:inline">
          {formatWeekRangeLabel(weekStart)}
        </span>

        <div className="flex-1" />

        {syncing && (
          <span className="text-xs text-moss-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-moss-500 animate-pulse" />
            Syncing
          </span>
        )}

        <div className="flex items-center bg-ink-100 rounded-lg p-0.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${
                granularity === g ? 'bg-white text-ink-800 shadow-soft' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {g}m
            </button>
          ))}
        </div>

        <button
          onClick={onSignOut}
          className="text-xs text-ink-400 hover:text-ink-600 px-2 hidden sm:block"
        >
          Sign out
        </button>
      </div>
      {error && (
        <div className="px-4 pb-2 -mt-1 flex items-center gap-2">
          <span className="text-xs text-rose-500 flex-1">{error}</span>
          <button onClick={onDismissError} className="text-xs text-ink-400 hover:text-ink-600">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
