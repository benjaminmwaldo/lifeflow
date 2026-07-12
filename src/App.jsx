import { useCallback, useEffect, useState } from 'react'
import { ensureAccessToken, isSignedIn, signOut } from './lib/googleAuth'
import { useEvents } from './hooks/useEvents'
import Toolbar from './components/Toolbar'
import CalendarGrid from './components/CalendarGrid'
import SignInScreen from './components/SignInScreen'
import { startOfWeek } from './lib/dateUtils'

export default function App() {
  const [signedIn, setSignedIn] = useState(isSignedIn())
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [granularity, setGranularity] = useState(30)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const events = useEvents()

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      await ensureAccessToken({ interactive: true })
      setSignedIn(true)
    } catch (e) {
      setAuthError(e.message || String(e))
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(() => {
    signOut()
    setSignedIn(false)
  }, [])

  // If a cached token already exists, kick off the first data load automatically.
  useEffect(() => {
    if (signedIn) events.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  if (!signedIn) {
    return <SignInScreen onSignIn={handleSignIn} loading={authLoading} error={authError} />
  }

  return (
    <div className="h-screen flex flex-col bg-paper">
      <Toolbar
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        granularity={granularity}
        setGranularity={setGranularity}
        syncing={events.syncing}
        error={events.error}
        onDismissError={() => events.setError(null)}
        onSignOut={handleSignOut}
      />
      <div className="flex-1 min-h-0">
        {events.loading ? (
          <div className="h-full flex items-center justify-center text-ink-400 text-sm">
            Loading your calendar…
          </div>
        ) : (
          <CalendarGrid
            weekStart={weekStart}
            granularity={granularity}
            getInstancesForRange={events.getInstancesForRange}
            createSingleEvent={events.createSingleEvent}
            updateInstanceFields={events.updateInstanceFields}
            moveOrResizeInstance={events.moveOrResizeInstance}
            deleteInstance={events.deleteInstance}
          />
        )}
      </div>
    </div>
  )
}
