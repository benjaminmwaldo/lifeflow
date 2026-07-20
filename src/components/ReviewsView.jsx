import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { goalsTable, reviewsTable, goalNotesTable } from '../lib/tables'
import { useStore } from '../context/store'
import { newId } from '../lib/id'
import { toISODate, fromISODate } from '../lib/dateUtils'
import { REVIEW_TYPES, anchorFor, shiftPeriod, periodLabel, reviewsDueOn } from '../lib/reviewDates'
import { computeTargetPeriod, LOCATION_LABEL } from '../lib/notesLogic'

const TYPE_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const REVIEW_TARGETS = ['weekly', 'monthly', 'quarterly', 'yearly']
const AI_CHECKINS = {
  weekly: {
    prompt: 'Weekly check-in',
    detail: 'Codex will aggregate the daily pulses, administer WHO-5 and the four faith anchors, run the rotating module due, and review the active experiment.',
  },
  monthly: {
    prompt: 'Monthly check-in',
    detail: 'Codex will run the weekly cycle, administer the full FCP-12 and any monthly measure due, summarize the month, and review the experiment trend.',
  },
  quarterly: {
    prompt: 'Quarterly check-in',
    detail: 'Codex will run the current weekly cycle, administer quarterly calibrations such as life satisfaction and financial well-being, and review goals and measurement burden.',
  },
  yearly: {
    prompt: 'Yearly optimization review',
    detail: 'Codex will compare the year with prior baselines, review every life domain and experiment, retire stale measures, and design the next cycle.',
  },
}

export default function ReviewsView({ simplified = false }) {
  const store = useStore()
  const goals = useTable(goalsTable, { autoLoad: !simplified })
  const reviews = useTable(reviewsTable, { autoLoad: !simplified })
  const goalNotes = useTable(goalNotesTable, { autoLoad: !simplified })

  const [type, setType] = useState('weekly')
  const [anchor, setAnchor] = useState(() => toISODate(anchorFor('weekly', new Date())))

  const existing = reviews.rows.find((r) => r.type === type && r.period_date === anchor)
  const [reflection, setReflection] = useState('')
  const [aiCheckinDone, setAiCheckinDone] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setReflection(existing?.reflection || '')
    setAiCheckinDone(existing?.ai_checkin_done === true || existing?.ai_checkin_done === 'TRUE')
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

  const existingAiDone = existing?.ai_checkin_done === true || existing?.ai_checkin_done === 'TRUE'
  const dirty = reflection !== (existing?.reflection || '') || aiCheckinDone !== existingAiDone
  function save() {
    if (existing) reviews.update({ ...existing, reflection, ai_checkin_done: aiCheckinDone })
    else reviews.add({ id: newId(), type, period_date: anchor, reflection, goal_review: '', notes: '', ai_checkin_done: aiCheckinDone })
    setSaved(true)
  }
  // Group active goals by their category, preserving first-seen order.
  const grouped = []
  const seen = new Map()
  for (const g of goals.rows.filter((x) => x.status !== 'archived')) {
    const cat = g.category || 'Other'
    if (!seen.has(cat)) {
      seen.set(cat, [])
      grouped.push([cat, seen.get(cat)])
    }
    seen.get(cat).push(g)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Reviews</h2>
          <p className="text-sm text-ink-400 mt-0.5">
            Adjudicate the ideas you pushed here, review each goal, reflect.
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

        <section className="mb-6 rounded-xl border border-moss-200 bg-moss-50/60 p-4">
            <div className="flex items-start gap-3">
              <input
                id="ai-checkin-done"
                type="checkbox"
                checked={aiCheckinDone}
                onChange={(event) => {
                  setAiCheckinDone(event.target.checked)
                  setSaved(false)
                }}
                className="mt-1 h-4 w-4 accent-moss-600"
              />
              <div>
                <label htmlFor="ai-checkin-done" className="text-sm font-medium text-ink-800 cursor-pointer">
                  Complete the AI check-in
                </label>
                <p className="text-sm text-ink-600 mt-1">
                  Open a fresh Codex chat and say <code className="px-1.5 py-0.5 rounded bg-white border border-moss-100 text-moss-700">{AI_CHECKINS[type].prompt}</code>.
                </p>
                <p className="text-xs text-ink-400 mt-1.5 leading-relaxed">{AI_CHECKINS[type].detail}</p>
              </div>
            </div>
        </section>

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

        {/* Adjudicated records */}
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
                    <p className="text-xs text-ink-500 mt-1.5 whitespace-pre-wrap border-l-2 border-ink-100 pl-2">{n.adjudication}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-goal review (grouped by category) + reflection — hidden in the offline mock harness */}
        {!simplified && (
          <>
            <section className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Goal review</h3>
              {grouped.length === 0 ? (
                <p className="text-sm text-ink-300 py-3 px-3.5 border border-dashed border-ink-200 rounded-xl">
                  No active goals. Add them in the Goals tab and they'll appear here to review.
                </p>
              ) : (
                grouped.map(([cat, gs]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-sm font-medium text-ink-700 mb-2">{cat}</p>
                    <div className="space-y-3 pl-1">
                      {gs.map((g) => (
                        <GoalReviewRow
                          key={g.id || g.rowNumber}
                          goal={g}
                          type={type}
                          anchor={anchor}
                          goalNotes={goalNotes}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Reflection</h3>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What happened this period? What did you learn? What's next?"
                rows={6}
                className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
              />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={save} disabled={!dirty} className="px-5 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors">
                  {existing ? 'Update review' : 'Save review'}
                </button>
                {saved && !dirty && <span className="text-xs text-moss-500">Saved</span>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// One goal in a review: status dot + goal text + a write-in box saved per (period, goal).
function GoalReviewRow({ goal, type, anchor, goalNotes }) {
  const existing = goalNotes.rows.find(
    (r) => r.review_type === type && r.period_date === anchor && r.goal_id === goal.id
  )
  const [draft, setDraft] = useState(existing?.text || '')

  useEffect(() => {
    setDraft(existing?.text || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, anchor, goal.id, existing?.rowNumber, goalNotes.loading])

  function save() {
    if (draft === (existing?.text || '')) return
    if (existing) goalNotes.update({ ...existing, text: draft })
    else goalNotes.add({ id: newId(), review_type: type, period_date: anchor, goal_id: goal.id, text: draft })
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink-700 mb-1">{goal.text}</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        placeholder="How did this go?"
        rows={2}
        className="w-full resize-y px-2.5 py-2 rounded-lg border border-ink-200 bg-white text-ink-700 text-sm placeholder-ink-300 focus:outline-none focus:border-moss-400"
      />
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
              Google Calendar
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
            <button onClick={() => store.resolveNote(note, adj)} className="px-3 h-7 rounded-lg text-ink-500 text-xs font-medium hover:bg-ink-100 transition-colors">
              Resolve
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
