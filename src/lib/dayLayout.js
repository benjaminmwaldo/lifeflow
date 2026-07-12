import { timeToMinutes } from './dateUtils'

function startMin(ev) {
  return timeToMinutes(ev.start_time)
}
function endMin(ev) {
  const s = startMin(ev)
  if (ev.duration_min) return s + Number(ev.duration_min)
  return timeToMinutes(ev.end_time) || s + 30
}

/** Assigns colIndex/maxCols to same-day instances so overlapping events sit side by side. */
export function layoutDay(instances) {
  const sorted = [...instances].sort((a, b) => startMin(a) - startMin(b))
  const clusters = []
  let current = []
  let currentEnd = -Infinity

  for (const ev of sorted) {
    const s = startMin(ev)
    if (current.length === 0 || s < currentEnd) {
      current.push(ev)
      currentEnd = Math.max(currentEnd, endMin(ev))
    } else {
      clusters.push(current)
      current = [ev]
      currentEnd = endMin(ev)
    }
  }
  if (current.length) clusters.push(current)

  const result = []
  for (const cluster of clusters) {
    const columns = []
    const withCols = cluster.map((ev) => {
      const s = startMin(ev)
      const e = endMin(ev)
      let colIndex = columns.findIndex((endTime) => endTime <= s)
      if (colIndex === -1) {
        colIndex = columns.length
        columns.push(e)
      } else {
        columns[colIndex] = e
      }
      return { ev, colIndex }
    })
    const maxCols = columns.length
    withCols.forEach(({ ev, colIndex }) => result.push({ ...ev, colIndex, maxCols }))
  }
  return result
}

export { startMin as eventStartMin, endMin as eventEndMin }
