// Table definitions for the non-calendar modules. Each is a tab in the same
// Google Sheet the calendar uses. Tabs are auto-created with their header row
// on first access. Add a column by appending to the list (never reorder —
// order maps to sheet columns).

import { createTable } from './sheetsTable'

// Note columns. The first five are kept for backward-compatibility with notes
// created before the push/adjudication model (their extra cells are blank and
// read as location 'inbox'). New fields are appended, never reordered.
// - location: inbox | weekly | monthly | quarterly | yearly (where the note lives)
// - period: '' for inbox; the review's Sunday-anchor ISO date otherwise
// - adjudication: free text written about the note at a review
// - decision: '' while pending; a label like '→ Calendar' / '→ Weekly' / 'Resolved' once handled (record)
export const notesTable = createTable({
  tabName: 'Notes',
  columns: [
    'id',
    'created',
    'text',
    'pinned_to',
    'linked_event_id',
    'location',
    'period',
    'adjudication',
    'decision',
  ],
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
