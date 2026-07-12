const MODULES = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'notes', label: 'Notes' },
  { key: 'journal', label: 'Journal' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'goals', label: 'Goals' },
]

export default function NavBar({ active, onSelect, onSignOut }) {
  return (
    <div className="border-b border-ink-100 bg-paper/95 backdrop-blur sticky top-0 z-40">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5">
        <div className="flex items-center gap-2 mr-1 sm:mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-sm bg-moss-400" />
          </div>
          <span className="font-display text-lg text-ink-800 hidden sm:block">LifeFlow</span>
        </div>
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin">
          {MODULES.map((m) => (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className={`px-3 h-8 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active === m.key ? 'bg-ink-800 text-paper' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <button onClick={onSignOut} className="text-xs text-ink-400 hover:text-ink-600 px-2 flex-shrink-0">
          Sign out
        </button>
      </div>
    </div>
  )
}
