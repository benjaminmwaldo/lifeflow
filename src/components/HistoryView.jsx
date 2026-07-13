import { useStore } from '../context/store'

export default function HistoryView() {
  const store = useStore()
  const acts = store.actions

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">History</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Actions you've taken this session. <kbd className="px-1 rounded bg-ink-100 text-ink-600">Ctrl</kbd>+
            <kbd className="px-1 rounded bg-ink-100 text-ink-600">Z</kbd> undoes the most recent. Session-scoped —
            this log clears when you reload.
          </p>
        </header>

        {store.error && <div className="mb-3 text-xs text-rose-500">{store.error}</div>}

        {acts.length === 0 ? (
          <div className="text-sm text-ink-300 py-12 text-center border border-dashed border-ink-200 rounded-xl">
            No actions yet. Pushing, adjudicating, resolving, or deleting notes will show up here.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {acts.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                  a.undone ? 'bg-ink-50/50 border-ink-100' : 'bg-white border-ink-100 shadow-soft'
                }`}
              >
                <span className={`flex-1 text-sm ${a.undone ? 'text-ink-300 line-through' : 'text-ink-800'}`}>
                  {a.label}
                </span>
                {a.undone ? (
                  <span className="text-[11px] text-ink-400">reverted</span>
                ) : (
                  <button
                    onClick={() => store.revertAction(a.id)}
                    className="px-2.5 h-7 rounded-lg border border-ink-200 text-ink-600 text-xs hover:bg-ink-50 transition-colors"
                  >
                    Revert
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
