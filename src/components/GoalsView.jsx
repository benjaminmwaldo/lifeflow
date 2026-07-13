import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { goalsTable } from '../lib/tables'
import { newId } from '../lib/id'

// Goals are ongoing life-vision items, not completable checkboxes: no status
// cycle. They can be archived (phased out) rather than "done". Categories are
// data-driven (from the `category` field) and editable — nothing hardcoded.
const stamp = () => new Date().toISOString()
const isArchived = (g) => g.status === 'archived'

export default function GoalsView() {
  const goals = useTable(goalsTable)
  const [draft, setDraft] = useState('')
  const [draftCat, setDraftCat] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editingCat, setEditingCat] = useState(null)
  const [catText, setCatText] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const active = goals.rows.filter((g) => !isArchived(g))
  const archived = goals.rows.filter(isArchived)
  const existingCats = [...new Set(goals.rows.map((g) => (g.category || '').trim()).filter(Boolean))]

  // Group active goals by category, first-seen order.
  const groups = []
  const seen = new Map()
  for (const g of active) {
    const c = (g.category || '').trim()
    if (!seen.has(c)) {
      seen.set(c, [])
      groups.push([c, seen.get(c)])
    }
    seen.get(c).push(g)
  }

  function addGoal() {
    const text = draft.trim()
    if (!text) return
    goals.add({ id: newId(), category: draftCat.trim(), text, status: 'active', updated: stamp() })
    setDraft('')
  }
  function saveEdit(g) {
    const t = editText.trim()
    if (t && t !== g.text) goals.update({ ...g, text: t, updated: stamp() })
    setEditingId(null)
  }
  function saveCat(oldCat) {
    const t = catText.trim()
    setEditingCat(null)
    if (t === oldCat) return
    goals.rows
      .filter((g) => (g.category || '').trim() === oldCat)
      .forEach((g) => goals.update({ ...g, category: t, updated: stamp() }))
  }
  const setStatus = (g, status) => goals.update({ ...g, status, updated: stamp() })

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Goals &amp; Vision</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Ongoing areas to work on — not checkboxes. Click a goal to rename, a category header to
            re-label it, or archive one to phase it out.
          </p>
        </header>

        <div className="flex gap-2 mb-5 flex-wrap">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Add a goal…"
            className="flex-1 min-w-[10rem] px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
          />
          <input
            value={draftCat}
            onChange={(e) => setDraftCat(e.target.value)}
            list="goal-cats"
            placeholder="Category (optional)"
            className="w-44 px-3 h-11 rounded-xl border border-ink-200 bg-white text-ink-700 text-sm placeholder-ink-300 focus:outline-none focus:border-moss-400"
          />
          <datalist id="goal-cats">
            {existingCats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
            <button onClick={() => goals.setError(null)} className="text-ink-400 hover:text-ink-600">Dismiss</button>
          </div>
        )}

        {goals.loading ? (
          <div className="text-sm text-ink-400 py-8 text-center">Loading goals…</div>
        ) : active.length === 0 ? (
          <div className="text-sm text-ink-300 py-12 text-center border border-dashed border-ink-200 rounded-xl">
            No active goals. Add one above.
          </div>
        ) : (
          groups.map(([cat, gs]) => (
            <div key={cat || '(none)'} className="mb-5">
              {editingCat === cat ? (
                <input
                  autoFocus
                  value={catText}
                  onChange={(e) => setCatText(e.target.value)}
                  onBlur={() => saveCat(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveCat(cat) }
                    if (e.key === 'Escape') setEditingCat(null)
                  }}
                  className="mb-2 w-full px-2 py-1 rounded-lg border border-moss-400 focus:outline-none text-ink-700 text-sm font-medium"
                />
              ) : (
                <button
                  onClick={() => { setEditingCat(cat); setCatText(cat) }}
                  title="Click to re-label this category"
                  className="mb-2 text-sm font-medium text-ink-700 hover:text-moss-600"
                >
                  {cat || 'Uncategorized'}
                </button>
              )}
              <ul className="space-y-1.5">
                {gs.map((goal) => (
                  <li
                    key={goal.rowNumber}
                    className="group flex items-center gap-3 bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-2.5 animate-pop-in"
                  >
                    {editingId === goal.rowNumber ? (
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => saveEdit(goal)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); saveEdit(goal) }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border border-moss-400 focus:outline-none text-ink-800 text-sm"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingId(goal.rowNumber); setEditText(goal.text) }}
                        title="Click to rename"
                        className="flex-1 text-left text-sm text-ink-800"
                      >
                        {goal.text}
                      </button>
                    )}
                    <button
                      onClick={() => setStatus(goal, 'archived')}
                      className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-ink-700 transition-opacity text-xs"
                    >
                      Archive
                    </button>
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
            </div>
          ))
        )}

        {archived.length > 0 && (
          <div className="mt-6 border-t border-ink-100 pt-4">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-medium text-ink-400 hover:text-ink-600"
            >
              {showArchived ? '▾' : '▸'} Archived ({archived.length})
            </button>
            {showArchived && (
              <ul className="space-y-1.5 mt-2">
                {archived.map((goal) => (
                  <li
                    key={goal.rowNumber}
                    className="group flex items-center gap-3 bg-ink-50/60 rounded-xl border border-ink-100 px-3.5 py-2.5"
                  >
                    <span className="flex-1 text-sm text-ink-400">{goal.text}</span>
                    <button
                      onClick={() => setStatus(goal, 'active')}
                      className="text-xs text-ink-500 hover:text-moss-600"
                    >
                      Restore
                    </button>
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
        )}
      </div>
    </div>
  )
}
