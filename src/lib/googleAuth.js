// Client-side Google auth using Google Identity Services (GIS) token client.
// No client secret involved — this is the implicit/token popup flow, appropriate
// for a static single-page app with no backend.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'
const STORAGE_KEY = 'cal.googleToken'

let tokenClient = null
let gisReady = null

/** Waits for the GIS <script> (loaded in index.html) to be available. */
function waitForGis() {
  if (gisReady) return gisReady
  gisReady = new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2)
      } else if (Date.now() - start > 10000) {
        reject(new Error('Google Identity Services failed to load. Check your connection and reload.'))
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  })
  return gisReady
}

function readStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.accessToken || !parsed.expiresAt) return null
    if (Date.now() >= parsed.expiresAt - 60_000) return null // treat as expired 60s early
    return parsed
  } catch {
    return null
  }
}

function storeToken(accessToken, expiresInSeconds) {
  const record = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  return record
}

export function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getValidAccessToken() {
  const stored = readStoredToken()
  return stored?.accessToken ?? null
}

/**
 * Requests an access token. Tries a silent (no UI) grant first; if that fails
 * (e.g. first ever sign-in on this device), falls back to the interactive
 * popup consent screen.
 */
export async function ensureAccessToken({ interactive = true } = {}) {
  const cached = getValidAccessToken()
  if (cached) return cached

  const oauth2 = await waitForGis()

  if (!tokenClient) {
    tokenClient = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {}, // overridden per-request below
    })
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error))
        return
      }
      const record = storeToken(response.access_token, response.expires_in ?? 3600)
      resolve(record.accessToken)
    }
    tokenClient.error_callback = (err) => {
      reject(new Error(err?.message || 'Google sign-in was cancelled or failed.'))
    }
    // 'consent' only on first-ever grant; otherwise try silent, then let the
    // caller retry interactively if this rejects.
    tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' })
  })
}

export function isSignedIn() {
  return !!getValidAccessToken()
}

export function signOut() {
  const token = getValidAccessToken()
  clearStoredToken()
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
}
