import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as sheetsApi from '../lib/sheetsApi'
import { expandOccurrences } from '../lib/recurrence'
import { newId } from '../lib/id'
import { addDays, fromISODate, toISODate } from '../lib/dateUtils'

// Turns raw sheet rows into { masters, exceptionsByKey } for fast lookup.
function partitionRows(rows) {
  const masters = []
  const exceptionsByKey = new Map() // `${exception_of_id}::${exception_date}` -> exception row
  for (const row of rows) {
    if (row.is_exception) {
      exceptionsByKey.set(`${row.exception_of_id}::${row.exception_date}`, row)
    } else {
      masters.push(row)
    }
  }
  return { masters, exceptionsByKey }
}

/** Builds the flattened, displayable event instances for [rangeStart, rangeEnd]. */
function materialize(masters, exceptionsByKey, rangeStart, rangeEnd) {
  const instances = []
  for (const master of masters) {
    const isRecurring = master.recurrence_type && master.recurrence_type !== 'none'
    const dates = expandOccurrences(master, rangeStart, rangeEnd)
    for (const occDate of dates) {
      const key = `${master.id}::${occDate}`
      const exception = exceptionsByKey.get(key)
      if (exception) {
        if (exception.is_cancelled) continue
        instances.push({
          instanceKey: key,
          id: master.id,
          rowNumber: exception.rowNumber,
          isException: true,
          isRecurring,
          occurrenceDate: occDate,
          date: exception.date || occDate,
          start_time: exception.start_time,
          end_time: exception.end_time,
          duration_min: exception.duration_min,
          title: exception.title,
          notes: exception.notes,
          color: exception.color,
          master,
        })
      } else {
        instances.push({
          instanceKey: key,
          id: master.id,
          rowNumber: master.rowNumber,
          isException: false,
          isRecurring,
          occurrenceDate: occDate,
          date: occDate,
          start_time: master.start_time,
          end_time: master.end_time,
          duration_min: master.duration_min,
          title: master.title,
          notes: master.notes,
          color: master.color,
          master,
        })
      }
    }
  }
  return instances
}

export function useEvents() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetched = await sheetsApi.listEvents()
      setRows(fetched)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const { masters, exceptionsByKey } = useMemo(() => partitionRows(rows), [rows])

  const getInstancesForRange = useCallback(
    (rangeStart, rangeEnd) => materialize(masters, exceptionsByKey, rangeStart, rangeEnd),
    [masters, exceptionsByKey]
  )

  function patchRowLocally(updated) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.rowNumber === updated.rowNumber)
      if (idx === -1) return [...prev, updated]
      const next = [...prev]
      next[idx] = updated
      return next
    })
  }

  function removeRowLocally(rowNumber) {
    setRows((prev) =>
      prev
        .filter((r) => r.rowNumber !== rowNumber)
        .map((r) => (r.rowNumber > rowNumber ? { ...r, rowNumber: r.rowNumber - 1 } : r))
    )
  }

  async function withSync(fn) {
    setSyncing(true)
    try {
      await fn()
    } catch (e) {
      setError(e.message || String(e))
      await reload() // resync truth from the sheet if something went wrong
    } finally {
      setSyncing(false)
    }
  }

  /** Creates a brand-new, non-recurring event. */
  const createSingleEvent = useCallback((date, startTime, endTime, title = '') => {
    const draft = {
      id: newId(),
      date,
      start_time: startTime,
      end_time: endTime,
      duration_min: '',
      title,
      notes: '',
      recurrence_type: 'none',
      recurrence_interval: 1,
      recurrence_end: '',
      recurrence_count: '',
      is_exception: false,
      exception_of_id: '',
      exception_date: '',
      is_cancelled: false,
    }
    // Optimistic local row with a temp negative rowNumber until the sheet confirms one.
    const tempRow = { ...draft, rowNumber: -Date.now() }
    setRows((prev) => [...prev, tempRow])
    withSync(async () => {
      const created = await sheetsApi.createEvent(draft)
      setRows((prev) => prev.map((r) => (r.rowNumber === tempRow.rowNumber ? created : r)))
    })
    return draft.id
  }, [])

  /** Updates title/notes on an instance. Handles single vs recurring occurrence vs existing exception. */
  const updateInstanceFields = useCallback((instance, fields, scope = 'this') => {
    if (!instance.isRecurring) {
      const current = rowsRef.current.find((r) => r.id === instance.id)
      if (!current) return
      const updated = { ...current, ...fields }
      patchRowLocally(updated)
      withSync(() => sheetsApi.updateEvent(updated))
      return
    }
    applyRecurringEdit(instance, fields, scope)
  }, [])

  /** Moves/resizes an instance (day/time/duration change) via drag. */
  const moveOrResizeInstance = useCallback((instance, fields, scope = 'this') => {
    if (!instance.isRecurring) {
      const current = rowsRef.current.find((r) => r.id === instance.id)
      if (!current) return
      const updated = { ...current, ...fields }
      patchRowLocally(updated)
      withSync(() => sheetsApi.updateEvent(updated))
      return
    }
    applyRecurringEdit(instance, fields, scope)
  }, [])

  function applyRecurringEdit(instance, fields, scope) {
    const master = rowsRef.current.find((r) => r.id === instance.master.id)
    if (!master) return

    if (scope === 'this') {
      const existing = rowsRef.current.find(
        (r) => r.is_exception && r.exception_of_id === instance.id && r.exception_date === instance.occurrenceDate
      )
      if (existing) {
        const updated = { ...existing, ...fields }
        patchRowLocally(updated)
        withSync(() => sheetsApi.updateEvent(updated))
      } else {
        const draft = {
          id: newId(),
          date: fields.date ?? instance.date,
          start_time: fields.start_time ?? instance.start_time,
          end_time: fields.end_time ?? instance.end_time,
          duration_min: fields.duration_min ?? instance.duration_min,
          title: fields.title ?? instance.title,
          notes: fields.notes ?? instance.notes,
          recurrence_type: 'none',
          recurrence_interval: 1,
          recurrence_end: '',
          recurrence_count: '',
          is_exception: true,
          exception_of_id: instance.id,
          exception_date: instance.occurrenceDate,
          is_cancelled: false,
        }
        const tempRow = { ...draft, rowNumber: -Date.now() }
        setRows((prev) => [...prev, tempRow])
        withSync(async () => {
          const created = await sheetsApi.createEvent(draft)
          setRows((prev) => prev.map((r) => (r.rowNumber === tempRow.rowNumber ? created : r)))
        })
      }
      return
    }

    // scope === 'following': split the series. Truncate the master to end the
    // day before this occurrence, then create a new master starting at this
    // occurrence date carrying the edited fields forward.
    const splitDate = fromISODate(instance.occurrenceDate)
    const dayBefore = toISODate(addDays(splitDate, -1))

    const occurrencesBefore = expandOccurrences(
      master,
      fromISODate(master.date),
      addDays(splitDate, -1)
    ).length
    const remainingCount = master.recurrence_count
      ? Math.max(0, Number(master.recurrence_count) - occurrencesBefore)
      : ''

    const truncatedMaster = {
      ...master,
      recurrence_end: dayBefore,
      recurrence_count: master.recurrence_count ? occurrencesBefore : '',
    }
    patchRowLocally(truncatedMaster)
    withSync(() => sheetsApi.updateEvent(truncatedMaster))

    // If the caller explicitly supplied a new recurrence pattern (the details
    // popover always sends all four keys together), honor it outright.
    // Otherwise this is a drag move/resize or plain field edit, so the new
    // master should simply continue the original series from the split point.
    const patternOverridden = Object.prototype.hasOwnProperty.call(fields, 'recurrence_type')

    let newRecurrenceEnd
    let newRecurrenceCount
    if (patternOverridden) {
      newRecurrenceEnd = fields.recurrence_end || ''
      newRecurrenceCount = fields.recurrence_count || ''
    } else if (master.recurrence_count) {
      newRecurrenceEnd = ''
      newRecurrenceCount = remainingCount
    } else {
      newRecurrenceEnd = master.recurrence_end
      newRecurrenceCount = ''
    }

    const newMasterDraft = {
      id: newId(),
      date: fields.date ?? instance.occurrenceDate,
      start_time: fields.start_time ?? instance.start_time,
      end_time: fields.end_time ?? instance.end_time,
      duration_min: fields.duration_min ?? instance.duration_min,
      title: fields.title ?? instance.title,
      notes: fields.notes ?? instance.notes,
      recurrence_type: patternOverridden ? fields.recurrence_type : master.recurrence_type,
      recurrence_interval: patternOverridden ? fields.recurrence_interval : master.recurrence_interval,
      recurrence_end: newRecurrenceEnd,
      recurrence_count: newRecurrenceCount,
      is_exception: false,
      exception_of_id: '',
      exception_date: '',
      is_cancelled: false,
    }
    const tempRow2 = { ...newMasterDraft, rowNumber: -Date.now() - 1 }
    setRows((prev) => [...prev, tempRow2])
    withSync(async () => {
      const created = await sheetsApi.createEvent(newMasterDraft)
      setRows((prev) => prev.map((r) => (r.rowNumber === tempRow2.rowNumber ? created : r)))
    })
  }

  /** Deletes an instance. scope: 'this' | 'following' (ignored for non-recurring). */
  const deleteInstance = useCallback((instance, scope = 'this') => {
    if (!instance.isRecurring) {
      const current = rowsRef.current.find((r) => r.id === instance.id)
      if (!current) return
      removeRowLocally(current.rowNumber)
      withSync(() => sheetsApi.deleteEventRow(current.rowNumber))
      return
    }

    const master = rowsRef.current.find((r) => r.id === instance.master.id)
    if (!master) return

    if (scope === 'this') {
      const existing = rowsRef.current.find(
        (r) => r.is_exception && r.exception_of_id === instance.id && r.exception_date === instance.occurrenceDate
      )
      if (existing) {
        const updated = { ...existing, is_cancelled: true }
        patchRowLocally(updated)
        withSync(() => sheetsApi.updateEvent(updated))
      } else {
        const draft = {
          id: newId(),
          date: instance.occurrenceDate,
          start_time: instance.start_time,
          end_time: instance.end_time,
          duration_min: instance.duration_min,
          title: instance.title,
          notes: '',
          recurrence_type: 'none',
          recurrence_interval: 1,
          recurrence_end: '',
          recurrence_count: '',
          is_exception: true,
          exception_of_id: instance.id,
          exception_date: instance.occurrenceDate,
          is_cancelled: true,
        }
        const tempRow = { ...draft, rowNumber: -Date.now() }
        setRows((prev) => [...prev, tempRow])
        withSync(async () => {
          const created = await sheetsApi.createEvent(draft)
          setRows((prev) => prev.map((r) => (r.rowNumber === tempRow.rowNumber ? created : r)))
        })
      }
      return
    }

    // 'following': truncate the master so it ends the day before this occurrence.
    const splitDate = fromISODate(instance.occurrenceDate)
    const dayBefore = toISODate(addDays(splitDate, -1))
    const occurrencesBefore = expandOccurrences(
      master,
      fromISODate(master.date),
      addDays(splitDate, -1)
    ).length

    if (occurrencesBefore === 0) {
      // The very first occurrence: deleting "this and following" removes the whole series.
      removeRowLocally(master.rowNumber)
      withSync(() => sheetsApi.deleteEventRow(master.rowNumber))
      return
    }

    const truncatedMaster = {
      ...master,
      recurrence_end: dayBefore,
      recurrence_count: master.recurrence_count ? occurrencesBefore : '',
    }
    patchRowLocally(truncatedMaster)
    withSync(() => sheetsApi.updateEvent(truncatedMaster))
  }, [])

  return {
    loading,
    error,
    syncing,
    getInstancesForRange,
    createSingleEvent,
    updateInstanceFields,
    moveOrResizeInstance,
    deleteInstance,
    reload,
    setError,
  }
}
