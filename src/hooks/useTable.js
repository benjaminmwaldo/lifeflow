// Generic list + optimistic CRUD hook over a sheetsTable. Mirrors the
// optimistic-then-sync pattern used by useEvents, minus the recurrence logic.

import { useCallback, useEffect, useRef, useState } from 'react'

export function useTable(table, { autoLoad = true } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await table.list())
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [table])

  useEffect(() => {
    if (autoLoad) reload()
  }, [autoLoad, reload])

  const withSync = useCallback(
    async (fn) => {
      setSyncing(true)
      try {
        await fn()
      } catch (e) {
        setError(e.message || String(e))
        await reload() // resync truth from the sheet on failure
      } finally {
        setSyncing(false)
      }
    },
    [reload]
  )

  // Adds optimistically with a temporary negative rowNumber, then swaps in the
  // real row once the sheet assigns one.
  const add = useCallback(
    (obj) => {
      const temp = { ...obj, rowNumber: -Date.now() }
      setRows((prev) => [...prev, temp])
      withSync(async () => {
        const created = await table.create(obj)
        setRows((prev) => prev.map((r) => (r.rowNumber === temp.rowNumber ? created : r)))
      })
      return temp
    },
    [table, withSync]
  )

  const update = useCallback(
    (obj) => {
      setRows((prev) => prev.map((r) => (r.rowNumber === obj.rowNumber ? obj : r)))
      withSync(() => table.update(obj))
    },
    [table, withSync]
  )

  const remove = useCallback(
    (rowNumber) => {
      setRows((prev) =>
        prev
          .filter((r) => r.rowNumber !== rowNumber)
          .map((r) => (r.rowNumber > rowNumber ? { ...r, rowNumber: r.rowNumber - 1 } : r))
      )
      withSync(() => table.remove(rowNumber))
    },
    [table, withSync]
  )

  return { rows, loading, error, syncing, reload, add, update, remove, setError }
}
