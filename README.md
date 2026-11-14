# FellowTrack — Orthopaedic Fellowship Tracker

Plan. Apply. Track. Get Selected.

A personal, installable (PWA) fellowship manager: dashboard, directory, application board, document vault,
observerships, foot & ankle, calendar/reminders (+ iPhone `.ics`), compare and notes.

## Privacy model
* **This repo is public and contains only code. It contains no personal data.**
* Your records and documents live (a) in your browser's IndexedDB and (b) optionally in a **private** repo
  (`db.json` + `files/`), synced from *Settings → Cloud sync* with a fine-grained token limited to that one repo.
* The token is stored only in your browser. Always keep the data repo **private** (the app refuses a public one).

## Develop
```
npm install
npm run dev       # local
npm run build     # type-check + production build into dist/
```
Deployed by GitHub Actions to GitHub Pages (`.github/workflows/deploy.yml`). Vite `base` is `./` and routing is hash-based,
so it works under any Pages path.

## Data file (`db.json` in the private repo)
`{ version:1, recs[], docs[], tasks[], notes[], profile, prefs }`. Every record has an `id` and `updatedAt` (ms);
the newest `updatedAt` wins on merge, deletions are tombstones (`deleted:true`). Anyone editing the file by hand
(or Claude in chat) must bump `updatedAt` on every record changed so the app picks it up.
