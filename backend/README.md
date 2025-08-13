# Backend (sql.js version)

This backend uses **sql.js** (WebAssembly) — no native builds required — so it runs smoothly in GitHub Codespaces and on Render.

## Commands
```bash
npm install
npm run dev   # starts on :4000
# or
npm start
```

## Environment
- `PORT` (optional) – default `4000`
- `DB_FILE` (optional) – path to the sqlite file (default: `backend/data.sqlite`)

## Notes
- The schema is applied on startup from `schema.sql`.
- Data is persisted to `data.sqlite` after every write.
