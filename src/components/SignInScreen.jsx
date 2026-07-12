export default function SignInScreen({ onSignIn, loading, error }) {
  return (
    <div className="h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-ink-800 flex items-center justify-center shadow-pop">
          <div className="w-8 h-6 rounded-sm bg-paper relative">
            <div className="absolute -top-1.5 left-1 w-1 h-2 rounded-full bg-moss-500" />
            <div className="absolute -top-1.5 right-1 w-1 h-2 rounded-full bg-moss-500" />
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-moss-500 rounded-t-sm" />
          </div>
        </div>
        <h1 className="font-display text-3xl text-ink-800 mb-2">Calendar</h1>
        <p className="text-ink-400 text-sm mb-8 leading-relaxed">
          A fast, personal week calendar backed by your own Google Sheet.
          Sign in to load and sync your events.
        </p>
        <button
          onClick={onSignIn}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-ink-800 text-paper font-medium text-sm hover:bg-ink-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Sign in with Google'}
        </button>
        {error && (
          <p className="mt-4 text-xs text-rose-500 leading-relaxed">{error}</p>
        )}
      </div>
    </div>
  )
}
