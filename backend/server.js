import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Utilities
const run = (sql, params=[]) => db.prepare(sql).run(params);
const get = (sql, params=[]) => db.prepare(sql).get(params);
const all = (sql, params=[]) => db.prepare(sql).all(params);

// -------- Clients --------
app.get('/api/clients', (req, res) => {
  const rows = all('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/clients', (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = run(
    `INSERT INTO clients (name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, company, notes]
  );
  const row = get('SELECT * FROM clients WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(row);
});

app.get('/api/clients/:id', (req, res) => {
  const client = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const invoices = all('SELECT * FROM invoice_summary WHERE client_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ client, invoices });
});

app.put('/api/clients/:id', (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  const existing = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  run(
    `UPDATE clients SET name=?, email=?, phone=?, company=?, notes=? WHERE id = ?`,
    [
      name ?? existing.name,
      email ?? existing.email,
      phone ?? existing.phone,
      company ?? existing.company,
      notes ?? existing.notes,
      req.params.id
    ]
  );
  const row = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  res.json(row);
});

app.delete('/api/clients/:id', (req, res) => {
  run('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// -------- Invoices --------
app.get('/api/invoices', (req, res) => {
  const rows = all('SELECT * FROM invoice_summary ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/invoices', (req, res) => {
  const { client_id, title, description, amount, due_date } = req.body;
  if (!client_id || !title || !amount) {
    return res.status(400).json({ error: 'client_id, title and amount are required' });
  }
  const info = run(
    `INSERT INTO invoices (client_id, title, description, amount, due_date) VALUES (?, ?, ?, ?, ?)`,
    [client_id, title, description, amount, due_date]
  );
  const row = get('SELECT * FROM invoice_summary WHERE invoice_id = ?', [info.lastInsertRowid]);
  res.status(201).json(row);
});

app.get('/api/invoices/:id', (req, res) => {
  const invoice = get('SELECT * FROM invoice_summary WHERE invoice_id = ?', [req.params.id]);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  const client = get('SELECT * FROM clients WHERE id = ?', [invoice.client_id]);
  const payments = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, created_at DESC', [req.params.id]);
  res.json({ invoice, client, payments });
});

app.put('/api/invoices/:id', (req, res) => {
  const existing = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, description, amount, due_date, client_id } = req.body;
  run(
    `UPDATE invoices SET client_id=?, title=?, description=?, amount=?, due_date=? WHERE id = ?`,
    [
      client_id ?? existing.client_id,
      title ?? existing.title,
      description ?? existing.description,
      amount ?? existing.amount,
      due_date ?? existing.due_date,
      req.params.id
    ]
  );
  const row = get('SELECT * FROM invoice_summary WHERE invoice_id = ?', [req.params.id]);
  res.json(row);
});

app.delete('/api/invoices/:id', (req, res) => {
  run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// -------- Payments --------
app.get('/api/payments', (req, res) => {
  const rows = all('SELECT * FROM payments ORDER BY paid_at DESC, created_at DESC');
  res.json(rows);
});

app.get('/api/invoices/:id/payments', (req, res) => {
  const rows = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, created_at DESC', [req.params.id]);
  res.json(rows);
});

app.post('/api/invoices/:id/payments', (req, res) => {
  const { amount, paid_at, method, notes } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const info = run(
    `INSERT INTO payments (invoice_id, amount, paid_at, method, notes) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, amount, paid_at, method, notes]
  );
  const row = get('SELECT * FROM payments WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(row);
});

// -------- Stats & Export --------
app.get('/api/stats', (req, res) => {
  const totals = get('SELECT COUNT(*) as clients FROM clients');
  const invAgg = get('SELECT COUNT(*) as invoices, IFNULL(SUM(invoice_amount),0) as total_amount, IFNULL(SUM(total_paid),0) as total_paid FROM invoice_summary');
  const outstanding = invAgg.total_amount - invAgg.total_paid;
  const recentPayments = all('SELECT * FROM payments ORDER BY paid_at DESC, created_at DESC LIMIT 10');
  // IMPORTANT: use single quotes so SQLite treats 'paid' as a string, not an identifier.
  const pendingInvoices = all("SELECT * FROM invoice_summary WHERE status != 'paid' ORDER BY (due_date IS NULL) ASC, due_date ASC, created_at DESC LIMIT 10");
  res.json({
    clients: totals.clients,
    invoices: invAgg.invoices,
    total_amount: invAgg.total_amount,
    total_paid: invAgg.total_paid,
    outstanding,
    recentPayments,
    pendingInvoices
  });
});

app.get('/api/export/csv', (req, res) => {
  const rows = all(`SELECT
    s.invoice_id,
    c.name as client_name,
    s.title,
    s.invoice_amount,
    s.total_paid,
    s.balance,
    s.status,
    s.due_date,
    s.created_at
    FROM invoice_summary s
    JOIN clients c ON c.id = s.client_id
    ORDER BY s.created_at DESC`);

  const header = ['invoice_id','client_name','title','invoice_amount','total_paid','balance','status','due_date','created_at'];
  const csv = [header.join(',')].concat(rows.map(r => header.map(h => String(r[h]).replace(',', ' ')).join(','))).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
