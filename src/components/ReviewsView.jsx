import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { notesTable, goalsTable, reviewsTable } from '../lib/tables'
import { newId } from '../lib/id'
import { toISODate, fromISODate } from '../lib/dateUtils'
import { REVIEW_TYPES, anchorFor, shiftPeriod, periodLabel, reviewsDueOn } from '../lib/reviewDates'

const TYPE_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const STATUS_GLYPH = { open: '○', in_motion: '◐', done: '●', dropped: '⊘' }
const STATUS_CYCLE = ['open', 'in_motion', 'done', 'dropped']
const STATUS_STYLE = {
  open: 'text-ink-400',
  in_motion: 'text-amber',
  done: 'text-moss-500',
  dropped: 'text-ink-300',
}

export default function ReviewsView() {
  const notes = useTable(notesTable)
  const goals = useTable(goalsTable)
  const reviews = useTable(reviewsTable)

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

  const pinned = notes.rows.filter((n) => n.pinned_to === type)
  const dueToday = reviewsDueOn(new Date())

  const dirty =
    reflection !== (existing?.reflection || '') || goalReview !== (existing?.goal_review || '')

  function save() {
    if (existing) {
      reviews.update({ ...existing, reflection, goal_review: goalReview })
    } else {
      reviews.add({
        id: newId(),
        type,
        period_date: anchor,
        reflection,
        goal_review: goalReview,
        notes: '',
      })
    }
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
            Reflection · goal review · the ideas you pinned here.
            {dueToday.length > 0 && (
              <span className="text-moss-600"> Due today: {dueToday.map((t) => TYPE_LABEL[t]).join(', ')}.</span>
            )}
          </p>
        </header>

        {/* Type selector */}
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

        {/* Period nav */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
            aria-label="Previous period"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-ink-700">{periodLabel(type, fromISODate(anchor))}</span>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
            aria-label="Next period"
          >
            ›
          </button>
          {existing && <span className="text-xs text-moss-500 ml-1">Saved review</span>}
        </div>

        {(reviews.error || notes.error || goals.error) && (
          <div className="mb-3 text-xs text-rose-500">
            {reviews.error || notes.error || goals.error}
          </div>
        )}

        {/* Pinned ideas */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
            Ideas pinned to this review
          </h3>
          {pinned.length === 0 ? (
            <p className="text-sm text-ink-300 py-3 px-3.5 border border-dashed border-ink-200 rounded-xl">
              Nothing pinned. In Notes, pin an idea to “{TYPE_LABEL[type]} review” and it shows up here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pinned.map((n) => (
                <li
                  key={n.rowNumber}
                  className="flex items-start gap-2 bg-white rounded-xl border border-ink-100 shadow-soft px-3.5 py-2.5"
                >
                  <span className="flex-1 text-sm text-ink-800 whitespace-pre-wrap">{n.text}</span>
                  <button
                    onClick={() => notes.update({ ...n, pinned_to: '' })}
                    className="text-xs text-ink-400 hover:text-moss-600 flex-shrink-0"
                    title="Mark handled (unpin)"
                  >
                    Done
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Goal review */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Goal review</h3>
          {goals.rows.length > 0 && (
            <ul className="space-y-1 mb-2">
              {goals.rows.map((g) => (
                <li key={g.rowNumber} className="flex items-center gap-2.5 text-sm px-1">
                  <button
                    onClick={() => cycleGoal(g)}
                    className={`text-base leading-none ${STATUS_STYLE[g.status] || 'text-ink-400'}`}
                    title={g.status}
                  >
                    {STATUS_GLYPH[g.status] || '○'}
                  </button>
                  <span
                    className={
                      g.status === 'done' || g.status === 'dropped'
                        ? 'text-ink-300 line-through'
                        : 'text-ink-700'
                    }
                  >
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

        {/* Reflection */}
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
          <button
            onClick={save}
            disabled={!dirty}
            className="px-5 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
          >
            {existing ? 'Update review' : 'Save review'}
          </button>
          {saved && !dirty && <span className="text-xs text-moss-500">Saved</span>}
        </div>
      </div>
    </div>
  )
}
