import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  formatDayLabel,
  formatTimeLabel,
  fromISODate,
  isSameDate,
  minutesToTime,
  timeToMinutes,
  toISODate,
} from '../lib/dateUtils'
import { layoutDay } from '../lib/dayLayout'
import EventBlock from './EventBlock'
import EventDetailsPopover from './EventDetailsPopover'
import RecurrenceScopePrompt from './RecurrenceScopePrompt'

const DAY_START_MIN = 6 * 60
const DAY_END_MIN = 22 * 60
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN
const PX_PER_MIN = 1.2
const GUTTER = 52
const DOUBLE_CLICK_MS = 300
const RENAME_DELAY_MS = 450

export default function CalendarGrid({
  weekStart,
  granularity,
  getInstancesForRange,
  createSingleEvent,
  updateInstanceFields,
  moveOrResizeInstance,
  deleteInstance,
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = new Date()

  const instances = useMemo(
    () => getInstancesForRange(weekStart, addDays(weekStart, 6)),
    [getInstancesForRange, weekStart]
  )

  const instancesByDay = useMemo(() => {
    const map = new Map()
    for (const day of days) map.set(toISODate(day), [])
    for (const inst of instances) {
      const arr = map.get(inst.date)
      if (arr) arr.push(inst)
    }
    const laidOut = new Map()
    for (const [dateKey, list] of map.entries()) laidOut.set(dateKey, layoutDay(list))
    return laidOut
  }, [instances, days])

  const [editingKey, setEditingKey] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [detailsInstance, setDetailsInstance] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // {instance, fields?, kind: 'move'|'edit'|'delete'}
  const [dragPreview, setDragPreview] = useState(null) // {instanceKey, dayIndex, startMin, duration}

  const dayColRefs = useRef([])
  const dragRef = useRef(null)
  const clickRef = useRef({ time: 0, key: null }) // for double vs slow-double detection
  const renameTimer = useRef(null)
  const copiedRef = useRef(null) // {date, startMin, duration, title}

  const findInstance = (key) => instances.find((i) => i.instanceKey === key)
  const durationOf = (inst) =>
    Number(inst.duration_min) || Math.max(granularity, timeToMinutes(inst.end_time) - timeToMinutes(inst.start_time))

  // ---- Drag (move + resize). Authoritative values live in dragRef so the
  // window listeners never read stale React state. ----
  function startDrag(e, instance, type) {
    e.preventDefault()
    const dayIndex = days.findIndex((d) => isSameDate(d, fromISODate(instance.date)))
    const colEl = dayColRefs.current[dayIndex]
    const colWidth = colEl ? colEl.getBoundingClientRect().width : 120
    const startMin = timeToMinutes(instance.start_time)
    const duration = durationOf(instance)
    const initial = { dayIndex, startMin, duration }

    dragRef.current = {
      type,
      instance,
      startClientX: e.clientX,
      startClientY: e.clientY,
      colWidth,
      startDayIndex: dayIndex,
      startMin,
      duration,
      moved: false,
      preview: initial,
    }
    setDragPreview({ instanceKey: instance.instanceKey, ...initial })

    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
    window.addEventListener('pointercancel', onDragEnd)
  }

  function onDragMove(e) {
    const d = dragRef.current
    if (!d) return
    const deltaX = e.clientX - d.startClientX
    const deltaY = e.clientY - d.startClientY
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) d.moved = true

    let preview
    if (d.type === 'move') {
      const dayDelta = Math.round(deltaX / d.colWidth)
      const newDayIndex = clamp(d.startDayIndex + dayDelta, 0, 6)
      const minuteDelta = Math.round(deltaY / PX_PER_MIN / granularity) * granularity
      const newStartMin = clamp(d.startMin + minuteDelta, DAY_START_MIN, DAY_END_MIN - d.duration)
      preview = { dayIndex: newDayIndex, startMin: newStartMin, duration: d.duration }
    } else {
      const minuteDelta = Math.round(deltaY / PX_PER_MIN / granularity) * granularity
      const newDuration = clamp(d.duration + minuteDelta, granularity, DAY_END_MIN - d.startMin)
      preview = { dayIndex: d.startDayIndex, startMin: d.startMin, duration: newDuration }
    }
    d.preview = preview
    setDragPreview({ instanceKey: d.instance.instanceKey, ...preview })
  }

  function onDragEnd() {
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointercancel', onDragEnd)
    const d = dragRef.current
    dragRef.current = null
    setDragPreview(null)
    if (!d) return

    const p = d.preview
    const changed =
      p.dayIndex !== d.startDayIndex || p.startMin !== d.startMin || p.duration !== d.duration

    // No real drag → it was a click on the event body.
    if (!d.moved || !changed) {
      if (d.type === 'move') handleEventClick(d.instance)
      return
    }

    const newDate = toISODate(days[p.dayIndex])
    const fields = {
      date: newDate,
      start_time: minutesToTime(p.startMin),
      end_time: minutesToTime(p.startMin + p.duration),
      duration_min: p.duration,
    }

    if (d.instance.isRecurring) {
      setPendingAction({ instance: d.instance, fields, kind: 'move' })
    } else {
      moveOrResizeInstance(d.instance, fields, 'this')
    }
  }

  // ---- Click semantics (file-explorer style) ----
  // single click: select (or, if already selected, begin rename after a pause)
  // fast double click: open full details
  function handleEventClick(instance) {
    const key = instance.instanceKey
    const now = Date.now()
    const isDouble = clickRef.current.key === key && now - clickRef.current.time < DOUBLE_CLICK_MS
    clickRef.current = { time: now, key }

    if (isDouble) {
      if (renameTimer.current) {
        clearTimeout(renameTimer.current)
        renameTimer.current = null
      }
      setEditingKey(null)
      setDetailsInstance(instance)
      return
    }

    if (selectedKey === key) {
      // Already selected → a deliberate second click means rename (slow double click).
      if (renameTimer.current) clearTimeout(renameTimer.current)
      renameTimer.current = setTimeout(() => {
        renameTimer.current = null
        setEditingKey(key)
      }, RENAME_DELAY_MS)
    } else {
      setSelectedKey(key)
    }
  }

  function handleColumnPointerDown(e, dayIndex) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const colEl = e.currentTarget
    const rect = colEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startOffsetY = e.clientY - rect.top

    function onUp(upEv) {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const dx = Math.abs(upEv.clientX - startX)
      const dy = Math.abs(upEv.clientY - startY)
      if (dx < 4 && dy < 4) {
        setSelectedKey(null) // clicking empty space deselects
        const minute = DAY_START_MIN + startOffsetY / PX_PER_MIN
        const snapped = Math.floor(minute / granularity) * granularity
        const clamped = clamp(snapped, DAY_START_MIN, DAY_END_MIN - granularity)
        const startTime = minutesToTime(clamped)
        const endTime = minutesToTime(clamped + granularity)
        const dateISO = toISODate(days[dayIndex])
        const newId = createSingleEvent(dateISO, startTime, endTime, '')
        setEditingKey(`${newId}::${dateISO}`)
      }
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ---- Keyboard: copy / paste / delete / escape on the selected event ----
  useEffect(() => {
    function onKey(e) {
      const el = document.activeElement
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing || editingKey || detailsInstance || pendingAction) return

      const meta = e.ctrlKey || e.metaKey
      if (meta && (e.key === 'c' || e.key === 'C')) {
        const inst = selectedKey && findInstance(selectedKey)
        if (inst) {
          copiedRef.current = {
            date: inst.date,
            startMin: timeToMinutes(inst.start_time),
            duration: durationOf(inst),
            title: inst.title,
          }
        }
      } else if (meta && (e.key === 'v' || e.key === 'V')) {
        pasteCopied()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const inst = selectedKey && findInstance(selectedKey)
        if (inst) {
          e.preventDefault()
          setSelectedKey(null)
          handleRequestDelete(inst)
        }
      } else if (e.key === 'Escape') {
        setSelectedKey(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, editingKey, detailsInstance, pendingAction, instances, days])

  function pasteCopied() {
    const c = copiedRef.current
    if (!c) return
    // Paste onto the same weekday in the currently-viewed week. If that lands on
    // the exact source slot (same week), offset by its duration so it's visible.
    const dow = fromISODate(c.date).getDay()
    const targetDate = toISODate(days[dow])
    let startMin = c.startMin
    if (targetDate === c.date) {
      startMin = clamp(startMin + c.duration, DAY_START_MIN, DAY_END_MIN - c.duration)
    }
    const startTime = minutesToTime(startMin)
    const endTime = minutesToTime(startMin + c.duration)
    const newId = createSingleEvent(targetDate, startTime, endTime, c.title)
    setSelectedKey(`${newId}::${targetDate}`)
  }

  function handleCommitTitle(instance, newTitle) {
    setEditingKey(null)
    if (newTitle === instance.title) return
    if (instance.isRecurring) {
      setPendingAction({ instance, fields: { title: newTitle }, kind: 'edit' })
    } else {
      updateInstanceFields(instance, { title: newTitle })
    }
  }

  function handleRequestDelete(instance) {
    if (instance.isRecurring) {
      setPendingAction({ instance, kind: 'delete' })
    } else {
      deleteInstance(instance, 'this')
    }
  }

  function handleDetailsSave(instance, fields) {
    const changesPattern = Object.prototype.hasOwnProperty.call(fields, 'recurrence_type')
    setDetailsInstance(null)
    if (instance.isRecurring && changesPattern) {
      updateInstanceFields(instance, fields, 'following')
    } else if (instance.isRecurring) {
      setPendingAction({ instance, fields, kind: 'edit' })
    } else {
      updateInstanceFields(instance, fields)
    }
  }

  function handleDetailsDelete(instance) {
    setDetailsInstance(null)
    handleRequestDelete(instance)
  }

  function resolvePendingAction(scope) {
    if (!pendingAction) return
    const { instance, fields, kind } = pendingAction
    if (kind === 'delete') deleteInstance(instance, scope)
    else if (kind === 'move') moveOrResizeInstance(instance, fields, scope)
    else if (kind === 'edit') updateInstanceFields(instance, fields, scope)
    setPendingAction(null)
  }

  const hours = []
  for (let h = DAY_START_MIN / 60; h <= DAY_END_MIN / 60; h++) hours.push(h)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="flex sticky top-0 z-20 bg-paper border-b border-ink-100">
        <div style={{ width: GUTTER }} className="flex-shrink-0" />
        {days.map((day) => {
          const isToday = isSameDate(day, today)
          return (
            <div key={toISODate(day)} className="flex-1 text-center py-2.5 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-ink-400 font-medium">
                {formatDayLabel(day)}
              </p>
              <p
                className={`text-sm font-medium mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday ? 'bg-moss-500 text-white' : 'text-ink-700'
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex relative" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
        <div style={{ width: GUTTER }} className="relative flex-shrink-0">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[10px] text-ink-300 font-medium"
              style={{ top: (h * 60 - DAY_START_MIN) * PX_PER_MIN }}
            >
              {h % 24 === 0 ? '12 AM' : formatTimeLabel(`${h % 24}:00`)}
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => {
          const dateKey = toISODate(day)
          const dayInstances = instancesByDay.get(dateKey) || []
          const isToday = isSameDate(day, today)
          return (
            <div
              key={dateKey}
              ref={(el) => (dayColRefs.current[dayIndex] = el)}
              className={`flex-1 min-w-0 relative border-l border-ink-100 grid-hline ${
                isToday ? 'bg-moss-50/30' : ''
              }`}
              style={{ backgroundSize: `100% ${granularity * PX_PER_MIN}px`, touchAction: 'pan-y' }}
              onPointerDown={(e) => handleColumnPointerDown(e, dayIndex)}
            >
              {dayInstances.map((inst) => {
                const isDragging = dragPreview?.instanceKey === inst.instanceKey
                const startMin = isDragging ? dragPreview.startMin : timeToMinutes(inst.start_time)
                const duration = isDragging
                  ? dragPreview.duration
                  : Number(inst.duration_min) || timeToMinutes(inst.end_time) - timeToMinutes(inst.start_time)
                const top = (startMin - DAY_START_MIN) * PX_PER_MIN
                const height = Math.max(duration * PX_PER_MIN, 16)
                const widthPct = 100 / inst.maxCols
                const leftPct = inst.colIndex * widthPct

                const style = {
                  top,
                  height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                }

                return (
                  <EventBlock
                    key={inst.instanceKey}
                    instance={inst}
                    style={style}
                    compact={granularity === 15 && duration <= 15}
                    editing={editingKey === inst.instanceKey}
                    selected={selectedKey === inst.instanceKey}
                    onCommitTitle={(t) => handleCommitTitle(inst, t)}
                    onRequestDelete={() => handleRequestDelete(inst)}
                    onRequestDetails={() => setDetailsInstance(inst)}
                    onDragMoveStart={(e) => startDrag(e, inst, 'move')}
                    onDragResizeStart={(e) => startDrag(e, inst, 'resize')}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {detailsInstance && (
        <EventDetailsPopover
          instance={detailsInstance}
          onSave={(fields) => handleDetailsSave(detailsInstance, fields)}
          onDelete={() => handleDetailsDelete(detailsInstance)}
          onClose={() => setDetailsInstance(null)}
        />
      )}

      {pendingAction && (
        <RecurrenceScopePrompt
          verb={pendingAction.kind === 'delete' ? 'Delete' : 'Apply this change to'}
          onChoose={resolvePendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}
