import { useState } from 'react'

export default function EventDetailsPopover({ instance, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(instance.title)
  const [notes, setNotes] = useState(instance.notes || '')
  const [date, setDate] = useState(instance.date)
  const [startTime, setStartTime] = useState(instance.start_time)
  const [endTime, setEndTime] = useState(instance.end_time)
  const [recurType, setRecurType] = useState(instance.master?.recurrence_type || 'none')
  const [recurInterval, setRecurInterval] = useState(instance.master?.recurrence_interval || 1)
  const [endMode, setEndMode] = useState(instance.master?.recurrence_count ? 'count' : 'date')
  const [recurEnd, setRecurEnd] = useState(instance.master?.recurrence_end || '')
  const [recurCount, setRecurCount] = useState(instance.master?.recurrence_count || 5)

  const patternLocked = instance.isRecurring && instance.occurrenceDate !== instance.master?.date

  function handleSave() {
    const startMin = toMinutes(startTime)
    const endMin = toMinutes(endTime)
    const fields = {
      title: title.trim() || 'Untitled',
      notes,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_min: Math.max(5, endMin - startMin),
    }
    if (!patternLocked) {
      fields.recurrence_type = recurType
      fields.recurrence_interval = Math.max(1, Number(recurInterval) || 1)
      fields.recurrence_end = recurType !== 'none' && endMode === 'date' ? recurEnd : ''
      fields.recurrence_count = recurType !== 'none' && endMode === 'count' ? Number(recurCount) || 1 : ''
    }
    onSave(fields)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-pop p-5 w-full max-w-sm animate-pop-in max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink-800">Event details</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-sm">
            Close
          </button>
        </div>

        <label className="block text-xs font-medium text-ink-500 mb-1">Title</label>
        <input
          className="w-full mb-3 rounded-lg border border-ink-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-ink-500 mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-moss-400"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Start</label>
            <input
              type="time"
              className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-moss-400"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">End</label>
            <input
              type="time"
              className="w-full rounded-lg border border-ink-100 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-moss-400"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <label className="block text-xs font-medium text-ink-500 mb-1">Notes</label>
        <textarea
          className="w-full mb-3 rounded-lg border border-ink-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-400 resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mb-4 border-t border-ink-100 pt-3">
          <label className="block text-xs font-medium text-ink-500 mb-1.5">Repeat</label>
          {patternLocked ? (
            <p className="text-xs text-ink-400 leading-relaxed">
              This occurrence is part of a series. Edit the first occurrence to change the repeat pattern,
              or use the scope prompt after moving/renaming to split the series from here.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <select
                  className="flex-1 rounded-lg border border-ink-100 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-moss-400"
                  value={recurType}
                  onChange={(e) => setRecurType(e.target.value)}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {recurType !== 'none' && (
                  <div className="flex items-center gap-1 text-xs text-ink-500 whitespace-nowrap">
                    every
                    <input
                      type="number"
                      min={1}
                      className="w-12 rounded-lg border border-ink-100 px-1.5 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-moss-400"
                      value={recurInterval}
                      onChange={(e) => setRecurInterval(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {recurType !== 'none' && (
                <div className="flex items-center gap-3 text-xs text-ink-500">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={endMode === 'date'}
                      onChange={() => setEndMode('date')}
                    />
                    Until
                  </label>
                  <input
                    type="date"
                    disabled={endMode !== 'date'}
                    className="rounded-lg border border-ink-100 px-2 py-1.5 text-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-moss-400"
                    value={recurEnd}
                    onChange={(e) => setRecurEnd(e.target.value)}
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={endMode === 'count'}
                      onChange={() => setEndMode('count')}
                    />
                    Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={endMode !== 'count'}
                    className="w-14 rounded-lg border border-ink-100 px-1.5 py-1.5 text-xs text-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-moss-400"
                    value={recurCount}
                    onChange={(e) => setRecurCount(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium mr-auto"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs text-ink-500 hover:text-ink-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-ink-800 text-paper text-xs font-medium hover:bg-ink-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function toMinutes(t) {
  const [h, m] = (t || '0:0').split(':').map(Number)
  return h * 60 + m
}
