// backend/server.js
// Adds created_by on invoices/payments and returns Recorded By + Client on responses

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DATA_DIR = path.resolve('./data');
const DB_FILE = path.join(DATA_DIR, 'app.sqlite');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SQL = await initSqlJs({ locateFile: file => 'node_modules/sql.js/dist/' + file });

function loadDB(){
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    return new SQL.Database(filebuffer);
  }
  return new SQL.Database();
}
function saveDB(db){
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function initSchema(db){
  // Create tables if missing (keeps your existing structure)
  db.run(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'staff',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clients(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, email TEXT, phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      title TEXT,
      description TEXT,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by INTEGER,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS payments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      amount REAL,
      percent REAL,
      method TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      created_by INTEGER,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Safe, idempotent column add (works on your existing DB)
  const ensureColumn = (table, column, type) => {
    const res = db.exec(`PRAGMA table_info(${table});`);
    const has = res.length ? res[0].values.some(row => row[1] === column) : false;
    if (!has) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  };
  ensureColumn('invoices','created_by','INTEGER');
  ensureColumn('payments','created_by','INTEGER');
}

function rowToObj(columns, row){
  const o = {};
  columns.forEach((c, i)=> o[c] = row[i]);
  return o;
}
function query(db, sql, params=[]){
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const cols = stmt.getColumnNames();
  const out = [];
  while (stmt.step()) out.push(rowToObj(cols, stmt.get()));
  stmt.free();
  return out;
}
function run(db, sql, params=[]){
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(bodyParser.json());

// --- Auth middleware (reads Bearer token if present) ---
function auth(req, res, next){
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  }catch(err){
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

const db = loadDB();
initSchema(db);

// ---------- AUTH ----------
app.post('/api/auth/register', (req,res)=>{
  const { name, email, password, role='staff' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const hash = bcrypt.hashSync(password, 10);
  try{
    run(db, `INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)`, [name||'', email, hash, role]);
    saveDB(db);
    res.json({ ok:true });
  }catch{
    res.status(400).json({ error: 'email already exists' });
  }
});
app.post('/api/auth/login', (req,res)=>{
  const { email, password } = req.body || {};
  const row = query(db, `SELECT * FROM users WHERE email=?`, [email])[0];
  if (!row) return res.status(401).json({ error:'invalid credentials' });
  const ok = bcrypt.compareSync(password, row.password_hash||'');
  if (!ok) return res.status(401).json({ error:'invalid credentials' });
  const token = jwt.sign({ id: row.id, email: row.email, role: row.role, name: row.name }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user: { id: row.id, email: row.email, role: row.role, name: row.name } });
});

// ---------- CLIENTS ----------
app.get('/api/clients', (req,res)=>{
  res.json(query(db, `SELECT * FROM clients ORDER BY id DESC`));
});

// ---------- INVOICES ----------
function buildInvoiceWhere(qs){
  const wh = [], pr = [];
  if (qs.client_id){ wh.push('i.client_id = ?'); pr.push(Number(qs.client_id)); }
  if (qs.status){
    if (qs.status === 'overdue'){ wh.push(`(i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now'))`); }
    else { wh.push('i.status = ?'); pr.push(qs.status); }
  }
  if (qs.overdue === 'true'){ wh.push(`(i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now'))`); }
  if (qs.from){ wh.push(`date(i.created_at) >= date(?)`); pr.push(qs.from); }
  if (qs.to){ wh.push(`date(i.created_at) <= date(?)`); pr.push(qs.to); }
  if (qs.q){
    wh.push(`(lower(i.title) LIKE ? OR lower(i.description) LIKE ?)`); 
    pr.push(`%${qs.q.toLowerCase()}%`, `%${qs.q.toLowerCase()}%`);
  }
  return { where: wh.length ? 'WHERE ' + wh.join(' AND ') : '', params: pr };
}

app.get('/api/invoices', (req,res)=>{
  const { where, params } = buildInvoiceWhere(req.query||{});
  const rows = query(db, `
    SELECT 
      i.*,
      (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid,
      (i.total - (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.invoice_id = i.id)) AS balance,
      CASE WHEN i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now') THEN 1 ELSE 0 END AS overdue,
      c.id AS client_id, c.name AS client_name, c.email AS client_email,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN users u ON u.id = i.created_by
    ${where}
    ORDER BY i.id DESC
  `, params).map(r => ({
    ...r,
    client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null,
    created_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null
  }));
  res.json(rows);
});

app.get('/api/invoices/:id', (req,res)=>{
  const id = Number(req.params.id);
  const inv = query(db, `
    SELECT 
      i.*,
      (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid,
      (i.total - (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.invoice_id = i.id)) AS balance,
      CASE WHEN i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now') THEN 1 ELSE 0 END AS overdue,
      c.id AS client_id, c.name AS client_name, c.email AS client_email,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN users u ON u.id = i.created_by
    WHERE i.id = ?
  `, [id])[0];
  if (!inv) return res.status(404).json({ error:'not found' });
  const pays = query(db, `
    SELECT p.*, u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM payments p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.invoice_id = ?
    ORDER BY p.id DESC
  `, [id]).map(p => ({
    ...p,
    recorded_by_user: p.created_by_id ? { id:p.created_by_id, name:p.created_by_name, email:p.created_by_email } : null
  }));
  res.json({
    ...inv,
    client: inv.client_id ? { id:inv.client_id, name:inv.client_name, email:inv.client_email } : null,
    created_by_user: inv.created_by_id ? { id:inv.created_by_id, name:inv.created_by_name, email:inv.created_by_email } : null,
    payments: pays
  });
});

app.post('/api/invoices', auth, (req,res)=>{
  const { client_id, title, description, total, due_date, created_at } = req.body || {};
  if (!client_id || !(Number(total) > 0)) return res.status(400).json({ error:'client_id and total required' });
  const createdBy = req.user?.id || null;
  run(db, `INSERT INTO invoices(client_id,title,description,total,due_date,created_at,created_by) VALUES(?,?,?,?,?,?,?)`, [
    Number(client_id), title||'', description||'', Number(total), due_date||null, created_at||new Date().toISOString(), createdBy
  ]);
  saveDB(db);
  res.json({ ok:true });
});

app.post('/api/invoices/:id/mark-paid', auth, (req,res)=>{
  const id = Number(req.params.id);
  const inv = query(db, `SELECT i.*, (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid FROM invoices i WHERE i.id=?`, [id])[0];
  if (!inv) return res.status(404).json({ error:'not found' });
  const balance = Number(inv.total) - Number(inv.amount_paid||0);
  if (balance <= 0){
    run(db, `UPDATE invoices SET status='paid' WHERE id=?`, [id]);
    saveDB(db);
    return res.json({ ok:true });
  }
  const createdBy = req.user?.id || null;
  run(db, `INSERT INTO payments(invoice_id, amount, note, created_at, created_by) VALUES(?,?,?,?,?)`, [
    id, balance, 'Auto: mark as paid', new Date().toISOString(), createdBy
  ]);
  run(db, `UPDATE invoices SET status='paid' WHERE id=?`, [id]);
  saveDB(db);
  res.json({ ok:true });
});

app.delete('/api/invoices/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  run(db, `DELETE FROM payments WHERE invoice_id=?`, [id]);
  run(db, `DELETE FROM invoices WHERE id=?`, [id]);
  saveDB(db);
  res.json({ ok:true });
});

// ---------- PAYMENTS ----------
app.get('/api/payments', (req,res)=>{
  const qs = req.query||{};
  const wh = [], pr = [];
  if (qs.invoice_id){ wh.push('p.invoice_id = ?'); pr.push(Number(qs.invoice_id)); }
  if (qs.from){ wh.push(`date(p.created_at) >= date(?)`); pr.push(qs.from); }
  if (qs.to){ wh.push(`date(p.created_at) <= date(?)`); pr.push(qs.to); }
  if (qs.client_id){ wh.push('i.client_id = ?'); pr.push(Number(qs.client_id)); } // filter by client
  const where = wh.length ? ('WHERE ' + wh.join(' AND ')) : '';
  const rows = query(db, `
    SELECT 
      p.*,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email,
      i.client_id AS client_id,
      c.name AS client_name, c.email AS client_email
    FROM payments p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN invoices i ON i.id = p.invoice_id
    LEFT JOIN clients c ON c.id = i.client_id
    ${where}
    ORDER BY p.id DESC
  `, pr).map(r => ({
    ...r,
    recorded_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
    client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null
  }));
  res.json(rows);
});

app.post('/api/payments', auth, (req,res)=>{
  const { invoice_id, amount, percent, method, note, created_at } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error:'invoice_id required' });
  const inv = query(db, `SELECT * FROM invoices WHERE id=?`, [Number(invoice_id)])[0];
  if (!inv) return res.status(404).json({ error:'invoice not found' });
  let amt = Number(amount)||0;
  if ((!amt || amt<=0) && percent){
    amt = (Number(inv.total||0) * Number(percent)) / 100.0;
  }
  if (!(amt>0)) return res.status(400).json({ error:'amount or percent required' });
  const createdBy = req.user?.id || null;
  run(db, `INSERT INTO payments(invoice_id, amount, percent, method, note, created_at, created_by) VALUES(?,?,?,?,?,?,?)`, [
    Number(invoice_id), amt, percent?Number(percent):null, method||'', note||'', created_at||new Date().toISOString(), createdBy
  ]);
  const paid = query(db, `SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id=?`, [Number(invoice_id)])[0].s;
  const newStatus = Number(paid) >= Number(inv.total) ? 'paid' : (paid>0 ? 'part-paid' : 'pending');
  run(db, `UPDATE invoices SET status=? WHERE id=?`, [newStatus, Number(invoice_id)]);
  saveDB(db);
  res.json({ ok:true });
});

app.delete('/api/payments/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  const row = query(db, `SELECT * FROM payments WHERE id=?`, [id])[0];
  if (!row) return res.status(404).json({ error:'not found' });
  run(db, `DELETE FROM payments WHERE id=?`, [id]);
  const inv = query(db, `SELECT * FROM invoices WHERE id=?`, [row.invoice_id])[0];
  if (inv){
    const paid = query(db, `SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id=?`, [row.invoice_id])[0].s;
    const newStatus = Number(paid) >= Number(inv.total) ? 'paid' : (paid>0 ? 'part-paid' : 'pending');
    run(db, `UPDATE invoices SET status=? WHERE id=?`, [newStatus, row.invoice_id]);
  }
  saveDB(db);
  res.json({ ok:true });
});

app.listen(PORT, ()=> console.log('Backend (auth+roles+created_by) running on :' + PORT));
