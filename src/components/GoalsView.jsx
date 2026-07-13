import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { goalsTable } from '../lib/tables'
import { newId } from '../lib/id'

// Simple goals list that feeds the Goal Review step of the review cadence.
// Status cycles through the four states Benjamin already uses in his tracker.
const STATUS_CYCLE = ['open', 'in_motion', 'done', 'dropped']
const STATUS_GLYPH = { open: '○', in_motion: '◐', done: '●', dropped: '⊘' }
const STATUS_STYLE = {
  open: 'text-ink-400',
  in_motion: 'text-amber',
  done: 'text-moss-500',
  dropped: 'text-ink-300',
}

export default function GoalsView() {
  const goals = useTable(goalsTable)
  const [draft, setDraft] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editText, setEditText] = useState('')

  function addGoal() {
    const text = draft.trim()
    if (!text) return
    goals.add({
      id: newId(),
      category: '',
      text,
      status: 'open',
      updated: new Date().toISOString(),
    })
    setDraft('')
  }

  function cycleStatus(goal) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(goal.status) + 1) % STATUS_CYCLE.length]
    goals.update({ ...goal, status: next, updated: new Date().toISOString() })
  }

  function startEdit(goal) {
    setEditingRow(goal.rowNumber)
    setEditText(goal.text)
  }
  function saveEdit(goal) {
    const text = editText.trim()
    if (text && text !== goal.text) goals.update({ ...goal, text, updated: new Date().toISOString() })
    setEditingRow(null)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Goals</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Click the dot to cycle status (open → in motion → done → dropped); click the text to rename.
          </p>
        </header>

        <div className="flex gap-2 mb-5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addGoal()
            }}
            placeholder="Add a goal…"
            className="flex-1 px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
          />
          <button
            onClick={addGoal}
            disabled={!draft.trim()}
            className="px-4 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
          >
            Add
          </button>
        </div>

        {goals.error && (
          <div className="mb-3 text-xs text-rose-500 flex items-center gap-2">
            <span className="flex-1">{goals.error}</span>
            <button onClick={() => goals.setError(null)} className="text-ink-400 hover:text-ink-600">
              Dismiss
            </button>
          </div>
        )}

        {goals.loading ? (
          <div className="text-sm text-ink-400 py-8 text-center">Loading goals…</div>
        ) : goals.rows.length === 0 ? (
          <div className="text-sm text-ink-300 py-12 text-center border border-dashed border-ink-200 rounded-xl">
            No goals yet. Add one above.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {goals.rows.map((goal) => (
              <li
                key={goal.rowNumber}
                className="group flex items-center gap-3 bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-2.5 animate-pop-in"
              >
                <button
                  onClick={() => cycleStatus(goal)}
                  className={`text-lg leading-none ${STATUS_STYLE[goal.status] || 'text-ink-400'}`}
                  title={goal.status}
                >
                  {STATUS_GLYPH[goal.status] || '○'}
                </button>
                {editingRow === goal.rowNumber ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(goal)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        saveEdit(goal)
                      }
                      if (e.key === 'Escape') setEditingRow(null)
                    }}
                    className="flex-1 px-2 py-1 rounded-lg border border-moss-400 focus:outline-none text-ink-800 text-sm"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(goal)}
                    title="Click to rename"
                    className={`flex-1 text-left text-sm ${
                      goal.status === 'done' || goal.status === 'dropped'
                        ? 'text-ink-300 line-through'
                        : 'text-ink-800'
                    }`}
                  >
                    {goal.text}
                  </button>
                )}
                <button
                  onClick={() => goals.remove(goal.rowNumber)}
                  className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-rose-500 transition-opacity text-sm"
                  aria-label="Delete goal"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
