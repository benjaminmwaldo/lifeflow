# LifeFlow

LifeFlow is Benjamin's Google Sheets-backed personal system for daily check-ins, notes, goals, and weekly through yearly reviews. It is a static React app with no server or database.

The app intentionally does **not** include its own calendar. Google Calendar is the calendar of record. Notes and review items can still open Google Calendar's prefilled event composer in a new tab; LifeFlow never writes to or deletes Google Calendar events itself.

## Modules

- **Daily Check-in** - the structured optimization pulse plus an optional journal entry.
- **Notes** - quick capture with onward routing to reviews or Google Calendar.
- **Reviews** - weekly, monthly, quarterly, and yearly goal review, reflection, and a persistent reminder to complete the matching Codex check-in.
- **Goals** - ongoing goals and categories.
- **Export** - JSON backup or per-table CSV.
- **History** - undoable actions from the current browser session.

## Daily check-in schema

One row per date is stored in the `Journal` tab. Existing legacy columns remain in place, and all new fields are appended for backward compatibility:

| Field | Values |
|---|---|
| `sleep_hours` | decimal hours |
| `sleep_quality` | 1-5 |
| `prayer_scripture` | yes / partial / no |
| `exercise` | yes / partial / no |
| `eating_pattern` | steady / restricted / loss of control |
| `food_gap_8h` | yes / no |
| `screen_with_meals` | none / some / most |
| `unplanned_media_minutes` | minutes |
| `meaningful_work` | yes / partial / no |
| `meaningful_connection` | yes / partial / no |
| `self_liking_score` | 0-10 |
| `energy` | 0-10 |
| `context_note` | short explanatory note |
| `entry` | optional longer journal entry |

Table headers are extended automatically when new columns are appended. Existing columns are never reordered or silently overwritten.

## Codex review handoff

Every review contains an AI check-in reminder. The exact prompts are:

- `Weekly check-in`
- `Monthly check-in`
- `Quarterly check-in`
- `Yearly optimization review`

The canonical interpretation of those prompts lives in `C:\Users\benja\Claude\LifeFlow\optimization\README.md` and the `optimize-life-loop` skill. This lets a fresh Codex chat continue without this conversation's history.

## Architecture

- React 18 + Tailwind + Vite
- Google Identity Services client-side OAuth
- Google Sheets API v4 using the spreadsheet scope
- One logical table per Sheet tab; tabs are created on first use
- No client secret and no backend

The configured Google OAuth client and Sheet live in `.env`. The Google account used in the app needs edit access to that Sheet. Add `http://localhost:5173` and the deployed GitHub Pages origin as authorized JavaScript origins in the OAuth client.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with Google.

## Build

```bash
npm run build
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes GitHub Pages on pushes to `main`. Configure these Actions variables:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_SHEET_ID`

`vite.config.js` derives the GitHub Pages base path from `GITHUB_REPOSITORY` during Actions builds.
