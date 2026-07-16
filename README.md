# Calendar

A fast, personal week-view calendar. React + Tailwind on the front end, a
Google Sheet as the only backend — no server, no database. Click to create
events, double-click to rename, drag to move or resize, and set up simple
recurring events (daily / weekly / monthly). Everything writes straight
through to the Sheet, so it's the same data whether you open it on your
phone or your laptop, and Claude can read it directly.

## How it's built

- **Frontend**: React 18 + Tailwind, bundled with Vite. Single-page app,
  no routing.
- **Data**: [Google Sheets API v4](https://developers.google.com/sheets/api).
  All events (and per-occurrence exceptions to recurring series) live as
  rows in one sheet tab. See "Data model" below.
- **Auth**: [Google Identity Services](https://developers.google.com/identity/gsi/web)
  token client — a client-side popup flow. There's no client secret and no
  backend; the OAuth Client ID is a public identifier, safe to ship in the
  bundle.

## One-time Google Cloud setup

The OAuth Client ID and target Sheet are already created for this project:

- Client ID: `298131201526-hdlegmp0cp863sfmjv9r8pdkp8hpej3p.apps.googleusercontent.com`
- Sheet ID: `1i2ikxGmnWb5avUmIVOESvOhlP89yXcae2r30l5va1no`

Before the app will work anywhere (locally or deployed), that OAuth client
needs the origin you're loading the app from listed as an **Authorized
JavaScript origin**:

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click the OAuth 2.0 Client ID above.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (for local dev)
   - `https://<your-username>.github.io` (once deployed — see below)
4. Save. Changes can take a few minutes to propagate.

Also make sure the Google account you'll sign in with has **edit access**
to the Sheet (open it once in Sheets and confirm you can type in a cell).
The app will create an "Events" tab and header row automatically the first
time it runs if one doesn't exist yet.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Sign in with Google when prompted — this
requests permission to read/write the one Sheet above (scope:
`https://www.googleapis.com/auth/spreadsheets`). Pushing a note to Calendar
opens Google Calendar's own prefilled "add event" link in a new tab (no
Calendar API, no extra scope, no cost) — you review and save it there.

Config lives in `.env` (already filled in with the values above; see
`.env.example`). No secrets are stored — everything in `.env` is public
once bundled, same as any client-side OAuth app.

## Deploying (GitHub Pages)

This repo ships with a GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds and publishes to GitHub Pages
automatically on every push to `main`.

1. Create a new empty repo on GitHub (public, so Pages is free) and push
   this project to it:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, add three
   repository variables (not secrets — none of these are sensitive):
   - `VITE_GOOGLE_CLIENT_ID` = `298131201526-hdlegmp0cp863sfmjv9r8pdkp8hpej3p.apps.googleusercontent.com`
   - `VITE_SHEET_ID` = `1i2ikxGmnWb5avUmIVOESvOhlP89yXcae2r30l5va1no`
   - `VITE_SHEET_TAB_NAME` = `Events`
4. Push (or re-run the workflow from the **Actions** tab). It builds and
   deploys to `https://<you>.github.io/<repo>/`.
5. Take that URL's origin (`https://<you>.github.io`, no path) and add it
   to the OAuth client's Authorized JavaScript origins as described above.
6. Open the Pages URL on your phone and laptop — same Google account, same
   Sheet, same events.

`vite.config.js` auto-detects the right base path when building inside
GitHub Actions (using `GITHUB_REPOSITORY`), so no manual path edits are
needed.

## Data model

One row per event **or** per exception to a recurring event, in the
`Events` tab:

| column | meaning |
|---|---|
| `id` | unique id for this row |
| `date` | anchor date (`YYYY-MM-DD`) — for recurring events, the date of the first occurrence |
| `start_time` / `end_time` | `HH:MM`, 24h |
| `duration_min` | minutes, kept in sync with start/end |
| `title` / `notes` | free text |
| `recurrence_type` | `none` / `daily` / `weekly` / `monthly` |
| `recurrence_interval` | every N days/weeks/months |
| `recurrence_end` | end date, if the series ends on a date |
| `recurrence_count` | occurrence count, if the series ends after N times (only one of `recurrence_end`/`recurrence_count` is set) |
| `is_exception` | `TRUE` if this row overrides a single occurrence of a recurring series |
| `exception_of_id` | the `id` of the master recurring row this overrides |
| `exception_date` | which virtual occurrence (by date) this exception replaces |
| `is_cancelled` | `TRUE` if this exception deletes that single occurrence |

Recurring events are **not** expanded into individual rows — the app
computes occurrences on the fly from the recurrence fields, then overlays
any exception rows on top. Editing or deleting a single occurrence writes
one exception row; choosing "this and following events" instead splits
the series (truncates the original row's end date/count and starts a new
row from that point).

## What's intentionally out of scope

Multiple calendars, sharing, notifications/reminders, and any backend
beyond the Sheet itself. See the project brief for the full list.
