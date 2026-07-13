import { VIEW_MODES } from '../lib/calendarViews'

const GRANULARITIES = [15, 30, 60]

function rangeLabel(days) {
  if (!days || !days.length) return ''
  const first = days[0]
  const last = days[days.length - 1]
  const startStr = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endStr = last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return days.length === 1 ? endStr : `${startStr} – ${endStr}`
}

export default function Toolbar({
  days,
  mode,
  setMode,
  onPrev,
  onNext,
  onToday,
  granularity,
  setGranularity,
  syncing,
  error,
  onDismissError,
  onSignOut,
  embedded = false,
}) {
  return (
    <div
      className={
        embedded
          ? 'border-b border-ink-100 bg-paper'
          : 'border-b border-ink-100 bg-paper/95 backdrop-blur sticky top-0 z-30'
      }
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
        {!embedded && (
          <>
            <div className="w-8 h-8 rounded-lg bg-ink-800 flex-shrink-0 flex items-center justify-center">
              <div className="w-4 h-3 rounded-sm bg-paper relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-moss-500 rounded-t-sm" />
              </div>
            </div>
            <h1 className="font-display text-xl text-ink-800 mr-2 hidden sm:block">Calendar</h1>
          </>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={onToday}
            className="px-3 h-8 rounded-lg hover:bg-ink-100 text-ink-600 text-sm font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        </div>

        <span className="text-sm text-ink-500 font-medium hidden md:inline">{rangeLabel(days)}</span>

        <div className="flex-1" />

        {syncing && (
          <span className="text-xs text-moss-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-moss-500 animate-pulse" />
            Syncing
          </span>
        )}

        {/* View span selector */}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="text-xs text-ink-600 bg-ink-100 rounded-lg px-2 h-8 focus:outline-none focus:ring-2 focus:ring-moss-400"
          aria-label="Calendar view span"
        >
          {VIEW_MODES.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>

        <div className="hidden sm:flex items-center bg-ink-100 rounded-lg p-0.5">
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

        {!embedded && onSignOut && (
          <button onClick={onSignOut} className="text-xs text-ink-400 hover:text-ink-600 px-2 hidden sm:block">
            Sign out
          </button>
        )}
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
