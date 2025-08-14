import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, get, all, insert } from './db.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ---------- Auth helpers ----------
function signToken(user){
  return jwt.sign({ id:user.id, email:user.email, role:user.role, name:user.name||null }, JWT_SECRET, { expiresIn: '7d' });
}
function authOptional(req, _res, next){
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token){
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}
function authRequired(req, res, next){
  authOptional(req, res, ()=>{
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    next();
  });
}
function requireRole(role){
  const ranks = { viewer: 1, staff: 2, admin: 3 };
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if ((ranks[req.user.role]||0) < (ranks[role]||0)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

// ---------- Auth routes ----------
app.post('/api/auth/register', authOptional, (req,res)=>{
  const { email, password, name=null, role='viewer' } = req.body||{};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const count = get('SELECT COUNT(*) AS c FROM users')?.c || 0;
  // First user becomes admin automatically
  const finalRole = count === 0 ? 'admin' : role;
  if (count > 0){
    // non-first registration requires admin
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  }
  const existing = get('SELECT id FROM users WHERE email=?', [email]);
  if (existing) return res.status(409).json({ error: 'email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const info = insert('INSERT INTO users (email,name,password_hash,role) VALUES (?,?,?,?)', [email, name, hash, finalRole]);
  const user = get('SELECT id,email,name,role FROM users WHERE id=?', [info.lastInsertRowid]);
  const token = signToken(user);
  res.json({ token, user });
});

app.post('/api/auth/login', (req,res)=>{
  const { email, password } = req.body||{};
  const user = get('SELECT * FROM users WHERE email=?', [email]);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = bcrypt.compareSync(password||'', user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: { id:user.id, email:user.email, name:user.name, role:user.role } });
});
app.get('/api/auth/me', authRequired, (req,res)=>{
  res.json({ user: req.user });
});

// ---------- Health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'payment-tracker-backend-sqljs-auth' }));

// ---------- Clients ----------
app.get('/api/clients', (_req, res) => {
  const rows = all('SELECT * FROM clients ORDER BY datetime(created_at) DESC');
  res.json(rows);
});
app.post('/api/clients', authRequired, requireRole('staff'), (req, res) => {
  const { name, email=null, phone=null, company=null, notes=null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = insert('INSERT INTO clients (name,email,phone,company,notes) VALUES (?,?,?,?,?)', [name, email, phone, company, notes]);
  const row = get('SELECT * FROM clients WHERE id = ?', [info.lastInsertRowid]);
  res.json(row);
});
app.delete('/api/clients/:id', authRequired, requireRole('admin'), (req,res)=>{
  const { force } = req.query;
  const cid = Number(req.params.id);
  const invCount = get('SELECT COUNT(*) AS c FROM invoices WHERE client_id=?', [cid])?.c || 0;
  if (invCount>0 && force!=='true') return res.status(409).json({ error: 'client has invoices; pass ?force=true to also remove invoices and payments' });
  if (force==='true'){
    const invs = all('SELECT id FROM invoices WHERE client_id=?', [cid]);
    for (const inv of invs){
      run('DELETE FROM payments WHERE invoice_id=?', [inv.id]);
    }
    run('DELETE FROM invoices WHERE client_id=?', [cid]);
  }
  const resu = run('DELETE FROM clients WHERE id=?', [cid]);
  res.json({ ok:true, deleted: resu.changes });
});

// ---------- Invoices ----------
app.get('/api/invoices', (req, res) => {
  const { status, client_id, overdue, from, to, q } = req.query || {};
  const where = [];
  const params = [];

  if (status && status !== 'overdue') { where.push('i.status = ?'); params.push(status); }
  if (client_id) { where.push('i.client_id = ?'); params.push(Number(client_id)); }
  if (from) { where.push("date(i.created_at) >= date(?)"); params.push(from); }
  if (to)   { where.push("date(i.created_at) <= date(?)"); params.push(to); }
  if (overdue === 'true' or status === 'overdue') {
    where.push("i.status != 'paid' AND i.due_date IS NOT NULL AND date(i.due_date) < date('now')");
  }
  if (q) {
    where.push('(i.title LIKE ? OR i.description LIKE ? OR c.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT i.*, c.id as c_id, c.name as c_name, c.email as c_email, c.phone as c_phone
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY datetime(i.created_at) DESC
  `;
  const rows = all(sql, params);
  const mapped = rows.map(r => ({
    id: r.id, client_id: r.client_id, title: r.title, description: r.description,
    total: r.total, status: r.status, amount_paid: r.amount_paid, due_date: r.due_date, created_at: r.created_at,
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

app.post('/api/invoices', authRequired, requireRole('staff'), (req, res) => {
  const { client_id, total, title = null, description = null, due_date = null } = req.body || {};
  if (!client_id || !(total > 0)) return res.status(400).json({ error: 'client_id and total required' });
  const info = insert('INSERT INTO invoices (client_id,total,title,description,due_date) VALUES (?,?,?,?,?)',
    [client_id, total, title, description, due_date]);
  const row = get('SELECT * FROM invoices WHERE id = ?', [info.lastInsertRowid]);
  res.json(row);
});

// Mark invoice as fully paid AND write a payment record
app.post('/api/invoices/:id/mark-paid', authRequired, requireRole('staff'), (req, res) => {
  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id=?', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'invoice not found' });
  const remaining = Math.max(0, Number(inv.total) - Number(inv.amount_paid));
  if (remaining > 0){
    insert('INSERT INTO payments (invoice_id,amount,percent,method,note) VALUES (?,?,?,?,?)',
      [inv.id, remaining, null, 'system', 'Marked paid']);
  }
  run('UPDATE invoices SET amount_paid = total, status = ? WHERE id = ?', ['paid', inv.id]);
  const updated = get('SELECT * FROM invoices WHERE id=?', [inv.id]);
  res.json(updated);
});

app.delete('/api/invoices/:id', authRequired, requireRole('admin'), (req,res)=>{
  const { force } = req.query;
  const id = Number(req.params.id);
  const payCount = get('SELECT COUNT(*) AS c FROM payments WHERE invoice_id=?', [id])?.c || 0;
  if (payCount>0 && force!=='true') return res.status(409).json({ error: 'invoice has payments; pass ?force=true to delete invoice and its payments' });
  run('DELETE FROM payments WHERE invoice_id=?', [id]);
  const resu = run('DELETE FROM invoices WHERE id=?', [id]);
  res.json({ ok:true, deleted: resu.changes });
});

// ---------- Payments ----------
app.get('/api/payments', (req, res) => {
  const { invoice_id, client_id, from, to } = req.query || {};
  const where = [];
  const params = [];
  if (invoice_id) { where.push('p.invoice_id = ?'); params.push(Number(invoice_id)); }
  if (client_id) { where.push('i.client_id = ?'); params.push(Number(client_id)); }
  if (from) { where.push("date(p.created_at) >= date(?)"); params.push(from); }
  if (to)   { where.push("date(p.created_at) <= date(?)"); params.push(to); }
  const sql = `SELECT p.* FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY datetime(p.created_at) DESC`;
  const rows = all(sql, params);
  res.json(rows);
});

app.post('/api/payments', authRequired, requireRole('staff'), (req, res) => {
  const { invoice_id, amount, percent, method = null, note = null } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error: 'invoice_id required' });

  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id = ?', [invoice_id]);
  if (!inv) return res.status(404).json({ error: 'invoice not found' });

  const payAmount = percent != null ? Number(inv.total) * (Number(percent) / 100) : Number(amount || 0);
  if (!(payAmount > 0)) return res.status(400).json({ error: 'amount or percent > 0 required' });

  insert('INSERT INTO payments (invoice_id,amount,percent,method,note) VALUES (?,?,?,?,?)',
    [invoice_id, payAmount, percent ?? null, method, note]);

  const newPaid = Number(inv.amount_paid) + payAmount;
  const newStatus = newPaid + 0.0001 >= Number(inv.total) ? 'paid' : 'part-paid';
  run('UPDATE invoices SET amount_paid=?, status=? WHERE id=?', [newPaid, newStatus, invoice_id]);

  res.json({ ok: true, invoice_id, amount_posted: payAmount, status: newStatus, amount_paid: newPaid });
});

app.delete('/api/payments/:id', authRequired, requireRole('admin'), (req,res)=>{
  const id = Number(req.params.id);
  // adjust invoice totals when deleting a payment
  const p = get('SELECT * FROM payments WHERE id=?', [id]);
  if (!p) return res.json({ ok:true, deleted: 0 });
  const inv = get('SELECT id,total,COALESCE(amount_paid,0) AS amount_paid FROM invoices WHERE id=?', [p.invoice_id]);
  if (inv){
    const newPaid = Math.max(0, Number(inv.amount_paid) - Number(p.amount||0));
    const newStatus = newPaid + 0.0001 >= Number(inv.total) ? 'paid' : (newPaid>0 ? 'part-paid' : 'pending');
    run('UPDATE invoices SET amount_paid=?, status=? WHERE id=?', [newPaid, newStatus, inv.id]);
  }
  const resu = run('DELETE FROM payments WHERE id=?', [id]);
  res.json({ ok:true, deleted: resu.changes });
});

// ---------- Stats ----------
app.get('/api/stats', (_req, res) => {
  const totals = get('SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(amount_paid),0) AS paid FROM invoices', []);
  const outstanding = Number(totals.total) - Number(totals.paid);
  const received = Number(totals.paid);
  const overdue = get("SELECT COUNT(*) AS n FROM invoices WHERE status != 'paid' AND due_date IS NOT NULL AND date(due_date) < date('now')", []);
  const pays = all('SELECT amount, created_at FROM payments', []);
  const now = new Date();
  const paymentsThisMonth = pays.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + Number(p.amount || 0), 0);
  res.json({ totalOutstanding: outstanding, totalReceived: received, overdueInvoices: overdue.n, paymentsThisMonth });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend (auth+roles) running on :' + PORT));
