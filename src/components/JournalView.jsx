import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { journalTable } from '../lib/tables'
import { addDays, fromISODate, toISODate } from '../lib/dateUtils'

// Journal + Self-liking + Mood are the main things (mirrors his DJ F22+
// columns) — everything else here is a secondary "quick pulse" layer added
// later. Order and visual weight in the JSX below should keep reflecting
// that priority; don't let the measured fields creep back to the top.
const EMPTY = {
  entry: '',
  self_liking: '',
  self_liking_score: '',
  mood: '',
  sleep_hours: '',
  sleep_quality: '',
  prayer_scripture: '',
  exercise: '',
  eating_pattern: '',
  food_gap_8h: '',
  screen_with_meals: '',
  unplanned_media_minutes: '',
  meaningful_work: '',
  meaningful_connection: '',
  energy: '',
  context_note: '',
}

const YES_PARTIAL_NO = [
  ['yes', 'Yes'],
  ['partial', 'Partial'],
  ['no', 'No'],
]

export default function JournalView({ table = journalTable }) {
  const journal = useTable(table)
  const [date, setDate] = useState(() => toISODate(new Date()))
  const existing = journal.rows.find((row) => row.date === date)
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(
      Object.fromEntries(
        Object.keys(EMPTY).map((key) => [key, existing?.[key] ?? ''])
      )
    )
    setSaved(false)
  }, [date, existing?.rowNumber, journal.loading])

  const dirty = Object.keys(EMPTY).some(
    (key) => form[key] !== (existing?.[key] ?? '')
  )

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function save() {
    if (existing) journal.update({ ...existing, ...form })
    else journal.add({ date, ...form })
    setSaved(true)
  }

  const isToday = date === toISODate(new Date())
  const label = fromISODate(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-center gap-2 mb-5">
          <div>
            <h2 className="font-display text-2xl text-ink-800">Journal</h2>
            <p className="text-sm text-ink-400 mt-0.5">
              {label}{isToday ? ' · Today' : ''}
            </p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDate(toISODate(addDays(fromISODate(date), -1)))}
              className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              onClick={() => setDate(toISODate(new Date()))}
              className="px-3 h-8 rounded-lg hover:bg-ink-100 text-ink-600 text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDate(toISODate(addDays(fromISODate(date), 1)))}
              className="w-8 h-8 rounded-lg hover:bg-ink-100 text-ink-500 flex items-center justify-center"
              aria-label="Next day"
            >
              ›
            </button>
          </div>
        </header>

        {journal.error && (
          <div className="mb-4 text-xs text-rose-500 flex items-center gap-2">
            <span className="flex-1">{journal.error}</span>
            <button onClick={() => journal.setError(null)} className="text-ink-400 hover:text-ink-600">
              Dismiss
            </button>
          </div>
        )}

        {/* Main things: journal, self-liking, and a word or two on the general vibe. */}
        <label className="block text-xs font-medium text-ink-500 mb-1.5">Journal</label>
        <textarea
          value={form.entry}
          onChange={(event) => setField('entry', event.target.value)}
          placeholder="How did the day go?"
          rows={10}
          className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        />

        <div className="flex items-center justify-between mt-4 mb-1.5">
          <label className="block text-xs font-medium text-ink-500">Self-liking</label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-300">0–10</span>
            {Array.from({ length: 11 }, (_, n) => String(n)).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setField('self_liking_score', n)}
                aria-label={`Self-liking ${n}`}
                className={`w-6 h-6 rounded-md text-[11px] font-medium transition-colors ${
                  form.self_liking_score === n
                    ? 'bg-ink-800 text-paper'
                    : 'bg-white border border-ink-200 text-ink-500 hover:bg-ink-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={form.self_liking}
          onChange={(event) => setField('self_liking', event.target.value)}
          placeholder="What do you like about yourself today?"
          rows={5}
          className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        />

        <label className="block text-xs font-medium text-ink-500 mb-1.5 mt-4">
          Mood <span className="font-normal text-ink-300">— a word or two, the general vibe</span>
        </label>
        <input
          value={form.mood}
          onChange={(event) => setField('mood', event.target.value)}
          placeholder="e.g. tired but good, restless, content"
          className="w-full px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        />

        {/* Everything below is the secondary quick-pulse layer — useful, but journal/self-liking/mood are what matter first. */}
        <div className="flex items-center gap-3 mt-8 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-300">Quick pulse</span>
          <div className="flex-1 h-px bg-ink-100" />
        </div>

        <Section title="Sleep & energy">
          <div className="grid sm:grid-cols-2 gap-4">
            <NumberField
              label="Sleep hours"
              value={form.sleep_hours}
              onChange={(value) => setField('sleep_hours', value)}
              min="0"
              max="24"
              step="0.25"
              placeholder="7.5"
            />
            <NumberField
              label="Sleep quality"
              hint="1–5"
              value={form.sleep_quality}
              onChange={(value) => setField('sleep_quality', value)}
              min="1"
              max="5"
              step="1"
            />
            <OptionGroup
              label="Exercise"
              value={form.exercise}
              onChange={(value) => setField('exercise', value)}
              options={YES_PARTIAL_NO}
            />
            <NumberField
              label="Energy"
              hint="0–10"
              value={form.energy}
              onChange={(value) => setField('energy', value)}
              min="0"
              max="10"
              step="1"
            />
          </div>
        </Section>

        <Section title="Faith & attention">
          <div className="grid sm:grid-cols-2 gap-4">
            <OptionGroup
              label="Prayer / Scripture"
              value={form.prayer_scripture}
              onChange={(value) => setField('prayer_scripture', value)}
              options={YES_PARTIAL_NO}
            />
            <NumberField
              label="Unplanned media"
              hint="minutes"
              value={form.unplanned_media_minutes}
              onChange={(value) => setField('unplanned_media_minutes', value)}
              min="0"
              step="1"
              placeholder="0"
            />
          </div>
        </Section>

        <Section title="Eating pattern">
          <div className="grid sm:grid-cols-2 gap-4">
            <OptionGroup
              label="Overall pattern"
              value={form.eating_pattern}
              onChange={(value) => setField('eating_pattern', value)}
              options={[
                ['steady', 'Steady'],
                ['restricted', 'Restricted'],
                ['loss of control', 'Loss of control'],
              ]}
            />
            <OptionGroup
              label="Any 8+ waking-hour food gap?"
              value={form.food_gap_8h}
              onChange={(value) => setField('food_gap_8h', value)}
              options={[
                ['yes', 'Yes'],
                ['no', 'No'],
              ]}
            />
            <OptionGroup
              label="Screens with meals"
              value={form.screen_with_meals}
              onChange={(value) => setField('screen_with_meals', value)}
              options={[
                ['none', 'None'],
                ['some', 'Some'],
                ['most', 'Most'],
              ]}
            />
          </div>
        </Section>

        <Section title="Work & connection">
          <div className="grid sm:grid-cols-2 gap-4">
            <OptionGroup
              label="Meaningful work"
              value={form.meaningful_work}
              onChange={(value) => setField('meaningful_work', value)}
              options={YES_PARTIAL_NO}
            />
            <OptionGroup
              label="Meaningful connection"
              value={form.meaningful_connection}
              onChange={(value) => setField('meaningful_connection', value)}
              options={YES_PARTIAL_NO}
            />
          </div>
        </Section>

        <Section title="Context">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">
            Short context note
          </label>
          <textarea
            value={form.context_note}
            onChange={(event) => setField('context_note', event.target.value)}
            placeholder="Stress, travel, illness, unusual events, or the one thing that explains today"
            rows={3}
            className="w-full resize-y px-3.5 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 leading-relaxed focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
          />
        </Section>

        <div className="flex items-center justify-end gap-3 pb-6">
          {(journal.syncing || (saved && !dirty)) && (
            <span className="text-xs text-moss-500">
              {journal.syncing ? 'Saving…' : 'Saved'}
            </span>
          )}
          <button
            onClick={save}
            disabled={!dirty || journal.syncing}
            className="px-6 h-11 rounded-xl bg-ink-800 text-paper text-sm font-medium disabled:opacity-40 hover:bg-ink-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-xl border border-ink-100 shadow-soft p-4 sm:p-5 mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-4">{title}</h3>
      {children}
    </section>
  )
}

function NumberField({ label, hint, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-500 mb-1.5">
        {label} {hint && <span className="font-normal text-ink-300">· {hint}</span>}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3.5 h-11 rounded-xl border border-ink-200 bg-white text-ink-800 placeholder-ink-300 focus:outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
        {...props}
      />
    </label>
  )
}

function OptionGroup({ label, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="block text-xs font-medium text-ink-500 mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`px-3 min-h-10 rounded-lg border text-sm font-medium transition-colors ${
              value === optionValue
                ? 'bg-ink-800 border-ink-800 text-paper'
                : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
