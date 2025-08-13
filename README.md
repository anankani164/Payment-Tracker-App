# Payment Tracker v1.0.2 (SQLite string fix)

Fixes:
- Use single quotes for status comparison in SQL (`status != 'paid'`) to avoid SQLite treating "paid" as a column.
- Keeps previous fixes: clients PUT `??`, NULL ordering for due_date, client names in invoice list.

## Run
```bash
npm install
npm run dev
```
Backend: http://localhost:4000  
Frontend: http://localhost:5173
