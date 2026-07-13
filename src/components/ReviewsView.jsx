import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { goalsTable, reviewsTable } from '../lib/tables'
import { useStore } from '../context/store'
import { newId } from '../lib/id'
import { toISODate, fromISODate } from '../lib/dateUtils'
import { REVIEW_TYPES, anchorFor, shiftPeriod, periodLabel, reviewsDueOn } from '../lib/reviewDates'
import { computeTargetPeriod, LOCATION_LABEL } from '../lib/notesLogic'

const TYPE_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const REVIEW_TARGETS = ['weekly', 'monthly', 'quarterly', 'yearly']
const STATUS_GLYPH = { open: '○', in_motion: '◐', done: '●', dropped: '⊘' }
const STATUS_CYCLE = ['open', 'in_motion', 'done', 'dropped']
const STATUS_STYLE = { open: 'text-ink-400', in_motion: 'text-amber', done: 'text-moss-500', dropped: 'text-ink-300' }

export default function ReviewsView({ simplified = false }) {
  const store = useStore()
  const goals = useTable(goalsTable, { autoLoad: !simplified })
  const reviews = useTable(reviewsTable, { autoLoad: !simplified })

  const [type, setType] = useState('weekly')
  const [anchor, setAnchor] = useState(() => toISODate(anchorFor('weekly', new Date())))

  const existing = reviews.rows.find((r) => r.type === type && r.period_date === anchor)
  const [reflection, setReflection] = useState('')
  const [goalReview, setGoalReview] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setReflection(existing?.reflection || '')
    setGoalReview(existing?.goal_review || '')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, anchor, existing?.rowNumber, reviews.loading])

  function changeType(t) {
    setType(t)
    setAnchor(toISODate(anchorFor(t, new Date())))
  }
  function navigate(dir) {
    setAnchor(toISODate(shiftPeriod(type, fromISODate(anchor), dir)))
  }

  const items = store.notesForReview(type, anchor)
  const pending = items.filter((n) => !n.decision)
  const records = items.filter((n) => n.decision)
  const dueToday = reviewsDueOn(new Date())

  const dirty = reflection !== (existing?.reflection || '') || goalReview !== (existing?.goal_review || '')
  function save() {
    if (existing) reviews.update({ ...existing, reflection, goal_review: goalReview })
    else reviews.add({ id: newId(), type, period_date: anchor, reflection, goal_review: goalReview, notes: '' })
    setSaved(true)
  }
  function cycleGoal(goal) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(goal.status) + 1) % STATUS_CYCLE.length]
    goals.update({ ...goal, status: next, updated: new Date().toISOString() })
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Reviews</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Adjudicate the ideas you pushed here, review goals, reflect.
            {dueToday.length > 0 && (
              <span className="text-moss-600"> Due today: {dueToday.map((t) => TYPE_LABEL[t]).join(', ')}.</span>
            )}
          </p>
        </header>

        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {REVIEW_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => changeType(t)}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors ${
                type === t ? 'bg-ink-800 text-paper' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center" aria-label="Previous period">‹</button>
          <span className="text-sm font-medium text-ink-700">{periodLabel(type, fromISODate(anchor))}</span>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center" aria-label="Next period">›</button>
        </div>

        {store.error && <div className="mb-3 text-xs text-rose-500">{store.error}</div>}

        {/* Pending pushed ideas */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">To adjudicate</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-ink-300 py-3 px-3.5 border border-dashed border-ink-200 rounded-xl">
              Nothing pending. Push a note here from the Notes inbox.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((n) => (
                <ReviewNoteItem key={n.id} note={n} store={store} currentType={type} currentAnchor={anchor} />
              ))}
            </ul>
          )}
        </section>

        {/* Adjudicated records (kept for the record) */}
        {records.length > 0 && (
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Record</h3>
            <ul className="space-y-2">
              {records.map((n) => (
                <li key={n.id} className="bg-ink-50/60 rounded-xl border border-ink-100 px-3.5 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 text-sm text-ink-700 whitespace-pre-wrap">{n.text}</span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-moss-50 text-moss-600 flex-shrink-0">
                      {n.decision}
                    </span>
                  </div>
                  {n.adjudication && (
                    <p className="text-xs text-ink-500 mt-1.5 whitespace-pre-wrap border-l-2 border-ink-100 pl-2">
                      {n.adjudication}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Goal review + reflection (hidden in the offline mock harness) */}
        {!simplified && (
          <>
            <section className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Goal review</h3>
              {goals.rows.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {goals.rows.map((g) => (
                    <li key={g.rowNumber} className="flex items-center gap-2.5 text-sm px-1">
                      <button onClick={() => cycleGoal(g)} className={`text-base leading-none ${STATUS_STYLE[g.status] || 'text-ink-400'}`} title={g.status}>
                        {STATUS_GLYPH[g.status] || '○'}
                      </button>
                      <span className={g.status === 'done' || g.status === 'dropped' ? 'text-ink-300 line-through' : 'text-ink-700'}>
                        {g.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea
                value={goalReview}
                onChange={(e) => setGoalReview(e.target.value)}
                placeholder="How are the goals going? What needs to change?"
                rows={4}
                className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
              />
            </section>

            <section className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Reflection</h3>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What happened this period? What did you learn? What's next?"
                rows={8}
                className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
              />
            </section>

            <div className="flex items-center gap-3">
              <button onClick={save} disabled={!dirty} className="px-5 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors">
                {existing ? 'Update review' : 'Save review'}
              </button>
              {saved && !dirty && <span className="text-xs text-moss-500">Saved</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReviewNoteItem({ note, store, currentType, currentAnchor }) {
  const [adj, setAdj] = useState(note.adjudication || '')
  const [pushing, setPushing] = useState(false)

  function forward(target) {
    if (target === 'calendar') {
      store.pushOnward(note, { kind: 'calendar' }, adj)
    } else {
      store.pushOnward(
        note,
        { kind: 'review', type: target, period: computeTargetPeriod(target, currentType, currentAnchor) },
        adj
      )
    }
    setPushing(false)
  }

  return (
    <li className="bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-3">
      <p className="text-sm text-ink-800 whitespace-pre-wrap mb-2">{note.text}</p>
      <textarea
        value={adj}
        onChange={(e) => setAdj(e.target.value)}
        onBlur={() => store.saveAdjudication(note, adj)}
        placeholder="Write about this — your thinking, the decision…"
        rows={2}
        className="w-full resize-y px-2.5 py-2 rounded-lg border border-ink-200 bg-white text-ink-700 text-sm placeholder-ink-300 focus:outline-none focus:border-moss-400"
      />
      <div className="mt-2">
        {pushing ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink-400 mr-0.5">Push to:</span>
            <button onClick={() => forward('calendar')} className="px-2.5 h-7 rounded-lg bg-moss-500 text-white text-xs font-medium hover:bg-moss-600">
              Calendar
            </button>
            {REVIEW_TARGETS.map((t) => (
              <button key={t} onClick={() => forward(t)} className="px-2.5 h-7 rounded-lg border border-ink-200 text-ink-700 text-xs hover:bg-ink-50">
                {LOCATION_LABEL[t]}
              </button>
            ))}
            <button onClick={() => setPushing(false)} className="px-2 h-7 rounded-lg text-ink-400 text-xs hover:text-ink-600">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPushing(true)} className="px-3 h-7 rounded-lg bg-ink-100 text-ink-700 text-xs font-medium hover:bg-ink-200 transition-colors">
              Push onward →
            </button>
            <button
              onClick={() => store.resolveNote(note, adj)}
              className="px-3 h-7 rounded-lg text-ink-500 text-xs font-medium hover:bg-ink-100 transition-colors"
            >
              Resolve
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
