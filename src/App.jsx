import { useCallback, useState } from 'react'
import { ensureAccessToken, isSignedIn, signOut } from './lib/googleAuth'
import SignInScreen from './components/SignInScreen'
import NavBar from './components/NavBar'
import NotesView from './components/NotesView'
import JournalView from './components/JournalView'
import ReviewsView from './components/ReviewsView'
import GoalsView from './components/GoalsView'
import ExportView from './components/ExportView'
import HistoryView from './components/HistoryView'
import MockApp from './components/MockApp'
import { StoreProvider } from './context/store'

export default function App() {
  // Dev-only offline harness (no sign-in). Never active in production builds.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('mock')) {
    return <MockApp />
  }

  const [signedIn, setSignedIn] = useState(isSignedIn())
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [active, setActive] = useState('journal')

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

  if (!signedIn) {
    return <SignInScreen onSignIn={handleSignIn} loading={authLoading} error={authError} />
  }

  return (
    <StoreProvider>
      <div className="h-screen flex flex-col bg-paper">
        <NavBar active={active} onSelect={setActive} onSignOut={handleSignOut} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {active === 'notes' && <NotesView />}
          {active === 'journal' && <JournalView />}
          {active === 'reviews' && <ReviewsView />}
          {active === 'goals' && <GoalsView />}
          {active === 'export' && <ExportView />}
          {active === 'history' && <HistoryView />}
        </div>
      </div>
    </StoreProvider>
  )
}
