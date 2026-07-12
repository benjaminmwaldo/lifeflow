import { fromISODate, toISODate } from '../lib/dateUtils'

// Placeholder for the review cadence engine (next milestone). It will detect
// which review is due by date and assemble Reflection + Goal Review + the
// notes pinned to that bucket. For now it just shows what's coming so the nav
// is complete and honest.
function whichReviewsToday(d) {
  const list = ['Weekly review (every Sunday)']
  const isSunday = d.getDay() === 0
  if (!isSunday) return { isSunday, list: [] }
  const dayOfMonth = d.getDate()
  if (dayOfMonth <= 7) list.push('Monthly review (first Sunday)')
  const month = d.getMonth()
  if ([0, 3, 6, 9].includes(month) && dayOfMonth <= 7) list.push('Quarterly review (first Sunday of quarter)')
  if (month === 0 && dayOfMonth <= 7) list.push('Yearly review (first Sunday of the year)')
  return { isSunday, list }
}

export default function ReviewsView() {
  const today = fromISODate(toISODate(new Date()))
  const { isSunday, list } = whichReviewsToday(today)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="font-display text-2xl text-ink-800">Reviews</h2>
          <p className="text-sm text-ink-400 mt-0.5">The Sunday cadence — reflection, goal review, and pinned ideas.</p>
        </header>

        <div className="bg-white rounded-xl border border-ink-100 shadow-soft p-5">
          <div className="text-sm text-ink-600">
            {isSunday ? (
              <>
                <p className="font-medium text-ink-800 mb-2">Due today:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {list.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Reviews run on Sundays. Nothing due today.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100 text-xs text-ink-400 leading-relaxed">
            <p className="font-medium text-ink-500 mb-1">Coming in the next milestone:</p>
            This tab will pull the notes you pinned to each review bucket, surface your goals for the Goal
            Review, draft a reflection from the week's journal + calendar, and save each completed review to
            the sheet — matching your existing weekly-review format.
          </div>
        </div>
      </div>
    </div>
  )
}
