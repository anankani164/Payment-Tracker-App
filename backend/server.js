import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { run, get, all, insert } from './db.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

function parseDateInput(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function sqlDate(d) { return d.toISOString().slice(0,10); }

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'payment-tracker-backend-sqljs' })
);

// Clients
app.get('/api/clients', (_req, res) => {
  const rows = all('SELECT * FROM clients ORDER BY datetime(created_at) DESC');
  res.json(rows);
});
app.post('/api/clients', (req, res) => {
  const { name, email=null, phone=null, company=null, notes=null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = insert('INSERT INTO clients (name,email,phone,company,notes) VALUES (?,?,?,?,?)',
    [name, email, phone, company, notes]);
  const row = get('SELECT * FROM clients WHERE id=?', [info.lastInsertRowid]);
  res.json(row);
});

// Invoices with filters/search
app.get('/api/invoices', (req, res) => {
  const { status, client_id, overdue, from, to, q } = req.query || {};
  const where = [];
  const params = [];
  if (status) { where.push('i.status = ?'); params.push(status); }
  if (client_id) { where.push('i.client_id = ?'); params.push(Number(client_id)); }
  const fromD = parseDateInput(from); if (fromD) { where.push("date(i.created_at) >= date(?)"); params.push(sqlDate(fromD)); }
  const toD = parseDateInput(to); if (toD) { where.push("date(i.created_at) <= date(?)"); params.push(sqlDate(toD)); }
  if (overdue === 'true') where.push("i.status != 'paid' AND i.due_date IS NOT NULL AND date(i.due_date) < date('now')");
  if (q) { where.push('(i.title LIKE ? OR i.description LIKE ? OR c.name LIKE ?)'); params.push(f`%{q}%`, f`%{q}%`, f`%{q}%`); }
  const sql = `
    SELECT i.*, c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY datetime(i.created_at) DESC`;
  const rows = all(sql, params);
  const mapped = rows.map(r => ({
    id: r.id, client_id: r.client_id, title: r.title, description: r.description, total: r.total,
    status: r.status, amount_paid: r.amount_paid, due_date: r.due_date, created_at: r.created_at,
    client: { id: r.c_id, name: r.c_name, email: r.c_email, phone: r.c_phone },
    balance: Number(r.total) - Number(r.amount_paid || 0),
    overdue: r.status !== 'paid' && r.due_date && new Date(r.due_date) < new Date(new Date().toDateString())
  }));
  res.json(mapped);
});

app.get('/api/invoices/:id', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'not found' });
  const client = get('SELECT * FROM clients WHERE id = ?', [inv.client_id]);
  const pays = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY datetime(created_at) DESC', [inv.id]);
  res.json({ ...inv, client, payments: pays });
});
app.post('/api/invoices', (req, res) => {
  const { client_id, total, title=null, description=null, due_date=null } = req.body || {};
  if (!client_id || !(total>0)) return res.status(400).json({ error: 'client_id and total required' });
  const info = insert('INSERT INTO invoices (client_id,total,title,description,due_date) VALUES (?,?,?,?,?)',
    [client_id, total, title, description, due_date]);
  const row = get('SELECT * FROM invoices WHERE id = ?', [info.lastInsertRowid]);
  res.json(row);
});
// Mark as paid
app.post('/api/invoices/:id/mark-paid', (req,res)=>{
  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id=?', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'invoice not found' });
  run('UPDATE invoices SET amount_paid = total, status = ? WHERE id = ?', ['paid', inv.id]);
  const updated = get('SELECT * FROM invoices WHERE id=?', [inv.id]);
  res.json(updated);
});

// Payments with filters
app.get('/api/payments', (req,res)=>{
  const { invoice_id, client_id, from, to } = req.query || {};
  const where = []; const params = [];
  if (invoice_id){ where.push('p.invoice_id = ?'); params.push(Number(invoice_id)); }
  if (client_id){ where.push('i.client_id = ?'); params.push(Number(client_id)); }
  const fromD = parseDateInput(from); if (fromD){ where.push("date(p.created_at) >= date(?)"); params.push(sqlDate(fromD)); }
  const toD = parseDateInput(to); if (toD){ where.push("date(p.created_at) <= date(?)"); params.push(sqlDate(toD)); }
  const sql = `SELECT p.* FROM payments p LEFT JOIN invoices i ON i.id=p.invoice_id
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY datetime(p.created_at) DESC`;
  res.json(all(sql, params));
});
app.post('/api/payments', (req,res)=>{
  const { invoice_id, amount, percent, method=null, note=null } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });
  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id=?', [invoice_id]);
  if (!inv) return res.status(404).json({ error: 'invoice not found' });
  const payAmount = (percent!=null) ? (Number(inv.total)*(Number(percent)/100)) : Number(amount||0);
  if (!(payAmount>0)) return res.status(400).json({ error: 'amount or percent > 0 required' });
  insert('INSERT INTO payments (invoice_id,amount,percent,method,note) VALUES (?,?,?,?,?)',
    [invoice_id, payAmount, percent ?? null, method, note]);
  const newPaid = Number(inv.amount_paid) + payAmount;
  const newStatus = (newPaid + 0.0001 >= Number(inv.total)) ? 'paid' : 'part-paid';
  run('UPDATE invoices SET amount_paid=?, status=? WHERE id=?', [newPaid, newStatus, invoice_id]);
  res.json({ ok:true, invoice_id, amount_posted: payAmount, status: newStatus, amount_paid: newPaid });
});

// Stats
app.get('/api/stats', (_req,res)=>{
  const totals = get('SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(amount_paid),0) AS paid FROM invoices', []);
  const outstanding = Number(totals.total) - Number(totals.paid);
  const received = Number(totals.paid);
  const overdue = get("SELECT COUNT(*) AS n FROM invoices WHERE status != 'paid' AND due_date IS NOT NULL AND date(due_date) < date('now')", []);
  const pays = all('SELECT amount, created_at FROM payments', []);
  const now = new Date();
  const paymentsThisMonth = pays.filter(p=>{
    const d = new Date(p.created_at);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).reduce((s,p)=> s+Number(p.amount||0), 0);
  res.json({ totalOutstanding: outstanding, totalReceived: received, overdueInvoices: overdue.n, paymentsThisMonth });
});

// Backup & Restore
app.get('/api/backup', (_req,res)=>{
  const payload = {
    exported_at: new Date().toISOString(),
    clients: all('SELECT * FROM clients ORDER BY id'),
    invoices: all('SELECT * FROM invoices ORDER BY id'),
    payments: all('SELECT * FROM payments ORDER BY id')
  };
  res.setHeader('Content-Type','application/json');
  res.setHeader('Content-Disposition','attachment; filename="payment-tracker-backup.json"');
  res.send(JSON.stringify(payload,null,2));
});
app.post('/api/restore', (req,res)=>{
  const { clients=[], invoices=[], payments=[] } = req.body || {};
  run('DELETE FROM payments'); run('DELETE FROM invoices'); run('DELETE FROM clients');
  for (const c of clients){
    insert('INSERT INTO clients (id,name,email,phone,company,notes,created_at) VALUES (?,?,?,?,?,?,?)',
      [c.id ?? null, c.name, c.email, c.phone, c.company, c.notes, c.created_at]);
  }
  for (const i of invoices){
    insert('INSERT INTO invoices (id,client_id,title,description,total,status,amount_paid,due_date,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [i.id ?? null, i.client_id, i.title, i.description, i.total, i.status, i.amount_paid, i.due_date, i.created_at]);
  }
  for (const p of payments){
    insert('INSERT INTO payments (id,invoice_id,amount,percent,method,note,created_at) VALUES (?,?,?,?,?,?,?)',
      [p.id ?? null, p.invoice_id, p.amount, p.percent, p.method, p.note, p.created_at]);
  }
  res.json({ ok:true, restored:{ clients:clients.length, invoices:invoices.length, payments:payments.length } });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Backend (filters+backup) running on :' + PORT));
