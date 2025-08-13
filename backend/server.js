import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { run, get, all, insert } from './db.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'payment-tracker-backend-sqljs' }));

// Clients
app.get('/api/clients', (req, res) => {
  const rows = all('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/clients', (req, res) => {
  const { name, email = null, phone = null, company = null, notes = null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = insert('INSERT INTO clients (name,email,phone,company,notes) VALUES (?,?,?,?,?)',
    [name, email, phone, company, notes]);
  const row = get('SELECT * FROM clients WHERE id = ?', [info.lastInsertRowid]);
  res.json(row);
});

// Invoices
app.get('/api/invoices', (req, res) => {
  const rows = all(`SELECT i.*, c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone
                    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
                    ORDER BY i.created_at DESC`);
  const mapped = rows.map(r => ({
    id: r.id, client_id: r.client_id, title: r.title, description: r.description,
    total: r.total, status: r.status, amount_paid: r.amount_paid, due_date: r.due_date, created_at: r.created_at,
    client: { id: r.c_id, name: r.c_name, email: r.c_email, phone: r.c_phone },
    balance: Number(r.total) - Number(r.amount_paid || 0)
  }));
  res.json(mapped);
});

app.get('/api/invoices/:id', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'not found' });
  const client = get('SELECT * FROM clients WHERE id = ?', [inv.client_id]);
  const pays = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC', [inv.id]);
  res.json({ ...inv, client, payments: pays });
});

app.post('/api/invoices', (req, res) => {
  const { client_id, total, title = null, description = null, due_date = null } = req.body || {};
  if (!client_id || !(total > 0)) return res.status(400).json({ error: 'client_id and total required' });
  const info = insert('INSERT INTO invoices (client_id,total,title,description,due_date) VALUES (?,?,?,?,?)',
    [client_id, total, title, description, due_date]);
  const row = get('SELECT * FROM invoices WHERE id = ?', [info.lastInsertRowid]);
  res.json(row);
});

// Payments
app.get('/api/payments', (req, res) => {
  const { invoice_id } = req.query;
  if (invoice_id) {
    const rows = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC', [invoice_id]);
    return res.json(rows);
  }
  const rows = all('SELECT * FROM payments ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/payments', (req, res) => {
  const { invoice_id, amount, percent, method = null, note = null } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id = ?', [invoice_id]);
  if (!inv) return res.status(404).json({ error: 'invoice not found' });

  const payAmount = (percent != null) ? (Number(inv.total) * (Number(percent) / 100)) : Number(amount || 0);
  if (!(payAmount > 0)) return res.status(400).json({ error: 'amount or percent > 0 required' });

  insert('INSERT INTO payments (invoice_id,amount,percent,method,note) VALUES (?,?,?,?,?)',
    [invoice_id, payAmount, percent ?? null, method, note]);

  const newPaid = Number(inv.amount_paid) + payAmount;
  const newStatus = (newPaid + 0.0001 >= Number(inv.total)) ? 'paid' : 'part-paid';
  run('UPDATE invoices SET amount_paid=?, status=? WHERE id=?', [newPaid, newStatus, invoice_id]);

  res.json({ ok: true, invoice_id, amount_posted: payAmount, status: newStatus, amount_paid: newPaid });
});

// Stats
app.get('/api/stats', (req, res) => {
  const totals = get('SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(amount_paid),0) AS paid FROM invoices', []);
  const outstanding = Number(totals.total) - Number(totals.paid);
  const received = Number(totals.paid);
  const overdue = get("SELECT COUNT(*) AS n FROM invoices WHERE status != 'paid' AND due_date IS NOT NULL AND date(due_date) < date('now')", []);

  const pays = all('SELECT amount, created_at FROM payments', []);
  const now = new Date();
  const paymentsThisMonth = pays
    .filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  res.json({ totalOutstanding: outstanding, totalReceived: received, overdueInvoices: overdue.n, paymentsThisMonth });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend (sql.js) running on :' + PORT));
