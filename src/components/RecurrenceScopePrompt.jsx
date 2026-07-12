export default function RecurrenceScopePrompt({ verb, onChoose, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-pop p-5 w-full max-w-xs animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-ink-700 mb-4 font-medium">
          This is a repeating event. {verb} which occurrences?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChoose('this')}
            className="w-full py-2.5 rounded-lg bg-ink-800 text-paper text-sm font-medium hover:bg-ink-700 transition-colors"
          >
            This event
          </button>
          <button
            onClick={() => onChoose('following')}
            className="w-full py-2.5 rounded-lg bg-ink-100 text-ink-700 text-sm font-medium hover:bg-ink-200 transition-colors"
          >
            This and following events
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-xs text-ink-400 hover:text-ink-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
