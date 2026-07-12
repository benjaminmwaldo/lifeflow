// Table definitions for the non-calendar modules. Each is a tab in the same
// Google Sheet the calendar uses. Tabs are auto-created with their header row
// on first access. Add a column by appending to the list (never reorder —
// order maps to sheet columns).

import { createTable } from './sheetsTable'

export const notesTable = createTable({
  tabName: 'Notes',
  columns: ['id', 'created', 'text', 'pinned_to', 'linked_event_id'],
})

export const journalTable = createTable({
  tabName: 'Journal',
  columns: ['date', 'entry', 'self_liking', 'mood'],
})

export const goalsTable = createTable({
  tabName: 'Goals',
  columns: ['id', 'category', 'text', 'status', 'updated'],
})

export const reviewsTable = createTable({
  tabName: 'Reviews',
  columns: ['id', 'type', 'period_date', 'reflection', 'goal_review', 'notes'],
})
