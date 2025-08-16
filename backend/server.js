// backend/server.js
// Adds: Super Admin user management + Multicurrency support
// Keeps: Existing endpoints (clients, invoices, payments, statement)
// + Back-compat aliases so older UI fields render: paid, recorded_by, created

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

const SQL = await initSqlJs({
  locateFile: file => 'node_modules/sql.js/dist/' + file
});

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
function getOne(db, sql, params=[]){
  return query(db, sql, params)[0] || null;
}
function run(db, sql, params=[]){
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}
function scalar(db, sql, params=[]){
  const row = getOne(db, sql, params);
  if (!row) return null;
  const key = Object.keys(row)[0];
  return row[key];
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(bodyParser.json());

// Auth middleware
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

// ---------- Schema ----------
function ensureColumn(db, table, column, type){
  const res = db.exec(`PRAGMA table_info(${table});`);
  const has = res.length ? res[0].values.some(row => row[1] === column) : false;
  if (!has) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
}
function initSchema(db){
  db.run(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'staff', -- 'superadmin' | 'admin' | 'staff'
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clients(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
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
      currency_code TEXT DEFAULT 'GHS',
      rate_to_base REAL DEFAULT 1.0,
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
      currency_code TEXT DEFAULT 'GHS',
      rate_to_base REAL DEFAULT 1.0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS settings(
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  ensureColumn(db, 'invoices', 'created_by', 'INTEGER');
  ensureColumn(db, 'invoices', 'currency_code', "TEXT DEFAULT 'GHS'");
  ensureColumn(db, 'invoices', 'rate_to_base', "REAL DEFAULT 1.0");
  ensureColumn(db, 'payments', 'created_by', 'INTEGER');
  ensureColumn(db, 'payments', 'currency_code', "TEXT DEFAULT 'GHS'");
  ensureColumn(db, 'payments', 'rate_to_base', "REAL DEFAULT 1.0");

  const base = scalar(db, `SELECT value FROM settings WHERE key='base_currency'`);
  if (!base) run(db, `INSERT OR REPLACE INTO settings(key,value) VALUES('base_currency','GHS')`);
}
initSchema(db);

// Settings helpers
function getBaseCurrency(){ return scalar(db, `SELECT value FROM settings WHERE key='base_currency'`) || 'GHS'; }
function isSuper(user){ return user?.role === 'superadmin'; }
function isAdmin(user){ return user?.role === 'admin' || user?.role === 'superadmin'; }
function countSuperAdmins(){ return Number(scalar(db, `SELECT COUNT(*) as c FROM users WHERE role='superadmin'`)) || 0; }

// ---------- Health / Me ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/auth/me', auth, (req,res)=>{
  const u = getOne(db, `SELECT id, name, email, role, created_at FROM users WHERE id=?`, [req.user.id]);
  res.json({ user: u });
});

// ---------- Auth ----------
app.post('/api/auth/register', (req,res)=>{
  const { name, email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const firstUser = countSuperAdmins() === 0 && (Number(scalar(db, `SELECT COUNT(*) as c FROM users`)) === 0);
  const userRole = firstUser ? 'superadmin' : (role || 'staff');
  const hash = bcrypt.hashSync(password, 10);
  try{
    run(db, `INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)`, [name||'', email, hash, userRole]);
    saveDB(db);
    res.json({ ok:true, role: userRole });
  }catch{
    res.status(400).json({ error: 'email already exists' });
  }
});

app.post('/api/auth/login', (req,res)=>{
  const { email, password } = req.body || {};
  const row = getOne(db, `SELECT * FROM users WHERE email=?`, [email]);
  if (!row) return res.status(401).json({ error:'invalid credentials' });
  const ok = bcrypt.compareSync(password, row.password_hash||'');
  if (!ok) return res.status(401).json({ error:'invalid credentials' });
  const token = jwt.sign({ id: row.id, email: row.email, role: row.role, name: row.name }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user: { id: row.id, email: row.email, role: row.role, name: row.name } });
});

// ---------- Users (Super Admin / Admin) ----------
app.get('/api/users', auth, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'forbidden' });
  const users = query(db, `SELECT id, name, email, role, created_at FROM users ORDER BY id ASC`);
  res.json(users);
});
app.post('/api/users', auth, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'forbidden' });
  const { name, email, password, role='staff' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error:'email and password required' });
  const targetRole = isSuper(req.user) ? role : (role === 'superadmin' ? 'admin' : role);
  if (!isSuper(req.user) && targetRole === 'superadmin') return res.status(403).json({ error:'cannot create superadmin' });
  const hash = bcrypt.hashSync(password, 10);
  try{
    run(db, `INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)`, [name||'', email, hash, targetRole]);
    saveDB(db);
    const id = scalar(db, `SELECT last_insert_rowid() AS id`);
    res.json({ ok:true, id });
  }catch{
    res.status(400).json({ error:'email already exists' });
  }
});
app.put('/api/users/:id', auth, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'forbidden' });
  const id = Number(req.params.id);
  const target = getOne(db, `SELECT * FROM users WHERE id=?`, [id]);
  if (!target) return res.status(404).json({ error:'not found' });

  const { name, email, role } = req.body || {};
  if (!isSuper(req.user) && target.role === 'superadmin') return res.status(403).json({ error:'cannot modify superadmin' });

  let newRole = target.role;
  if (role){
    if (isSuper(req.user)) newRole = role;
    else {
      if (role === 'superadmin') return res.status(403).json({ error:'cannot assign superadmin' });
      newRole = role;
    }
  }
  run(db, `UPDATE users SET name=?, email=?, role=? WHERE id=?`,
      [ name ?? target.name, email ?? target.email, newRole, id ]);
  saveDB(db);
  res.json({ ok:true });
});
app.patch('/api/users/:id/password', auth, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'forbidden' });
  const id = Number(req.params.id);
  const target = getOne(db, `SELECT * FROM users WHERE id=?`, [id]);
  if (!target) return res.status(404).json({ error:'not found' });
  if (!isSuper(req.user) && target.role === 'superadmin') return res.status(403).json({ error:'cannot modify superadmin' });
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error:'password required' });
  const hash = bcrypt.hashSync(password, 10);
  run(db, `UPDATE users SET password_hash=? WHERE id=?`, [hash, id]);
  saveDB(db);
  res.json({ ok:true });
});
app.delete('/api/users/:id', auth, (req,res)=>{
  if (!isAdmin(req.user)) return res.status(403).json({ error:'forbidden' });
  const id = Number(req.params.id);
  const target = getOne(db, `SELECT * FROM users WHERE id=?`, [id]);
  if (!target) return res.status(404).json({ error:'not found' });
  if (!isSuper(req.user) && target.role === 'superadmin') return res.status(403).json({ error:'cannot delete superadmin' });
  if (isSuper(req.user) && target.role === 'superadmin'){
    const superCount = countSuperAdmins();
    if (superCount <= 1) return res.status(400).json({ error:'cannot delete last superadmin' });
  }
  run(db, `DELETE FROM users WHERE id=?`, [id]);
  saveDB(db);
  res.json({ ok:true });
});

// ---------- Clients ----------
app.get('/api/clients', auth, (req,res)=>{
  res.json(query(db, `SELECT * FROM clients ORDER BY id DESC`));
});
app.post('/api/clients', auth, (req,res)=>{
  const { name, email, phone, created_at } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  try{
    run(db, `INSERT INTO clients(name,email,phone,created_at) VALUES(?,?,?,?)`,
      [ name, email||'', phone||'', created_at || new Date().toISOString() ]);
    const id = scalar(db, `SELECT last_insert_rowid() AS id`);
    saveDB(db);
    res.json({ ok:true, id });
  }catch{
    res.status(400).json({ error: 'could not create client' });
  }
});
app.put('/api/clients/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  const { name, email, phone } = req.body || {};
  const existing = getOne(db, `SELECT * FROM clients WHERE id=?`, [id]);
  if (!existing) return res.status(404).json({ error:'not found' });
  run(db, `UPDATE clients SET name=?, email=?, phone=? WHERE id=?`,
    [ name ?? existing.name, email ?? existing.email, phone ?? existing.phone, id ]);
  saveDB(db);
  res.json({ ok:true });
});
app.delete('/api/clients/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  run(db, `DELETE FROM clients WHERE id=?`, [id]);
  saveDB(db);
  res.json({ ok:true });
});

// ---------- Multicurrency helpers ----------
function coalesceRate(r){ const v = Number(r); return isFinite(v) && v>0 ? v : 1.0; }
function invPaidBase(invoiceId){
  return Number(scalar(db, `SELECT COALESCE(SUM(p.amount * COALESCE(p.rate_to_base, i.rate_to_base)),0) AS s
                            FROM payments p
                            LEFT JOIN invoices i ON i.id = p.invoice_id
                            WHERE p.invoice_id = ?`, [invoiceId])) || 0;
}

// ---------- Invoices ----------
function buildInvoiceWhere(qs){
  const wh = [], pr = [];
  if (qs.client_id){ wh.push('i.client_id = ?'); pr.push(Number(qs.client_id)); }
  if (qs.status){
    if (qs.status === 'overdue'){
      wh.push(`(i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now'))`);
    } else {
      wh.push('i.status = ?'); pr.push(qs.status);
    }
  }
  if (qs.overdue === 'true'){
    wh.push(`(i.status <> 'paid' AND i.due_date IS NOT NULL AND datetime(i.due_date) < datetime('now'))`);
  }
  if (qs.from){ wh.push(`date(i.created_at) >= date(?)`); pr.push(qs.from); }
  if (qs.to){ wh.push(`date(i.created_at) <= date(?)`); pr.push(qs.to); }
  if (qs.q){
    wh.push(`(lower(i.title) LIKE ? OR lower(i.description) LIKE ?)`);
    pr.push(`%${qs.q.toLowerCase()}%`, `%${qs.q.toLowerCase()}%`);
  }
  return { where: wh.length ? 'WHERE ' + wh.join(' AND ') : '', params: pr };
}

app.get('/api/invoices', auth, (req,res)=>{
  const { where, params } = buildInvoiceWhere(req.query||{});
  const rows = query(db, `
    SELECT
      i.*,
      (SELECT COALESCE(SUM(p.amount * COALESCE(p.rate_to_base, i.rate_to_base)),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid_base,
      (SELECT COALESCE(SUM(p.amount * COALESCE(p.rate_to_base, i.rate_to_base) / NULLIF(i.rate_to_base,0)),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid_in_inv,
      c.id AS client_id, c.name AS client_name, c.email AS client_email,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN users u ON u.id = i.created_by
    ${where}
    ORDER BY i.id DESC
  `, params).map(r => {
    const total_base = Number(r.total || 0) * coalesceRate(r.rate_to_base);
    const paid_base = Number(r.amount_paid_base || 0);
    const balance_base = total_base - paid_base;
    const amount_paid = Number(r.amount_paid_in_inv || 0);
    const balance = Number(r.total || 0) - amount_paid;
    const overdue = (r.status !== 'paid' && r.due_date && new Date(r.due_date).getTime() < Date.now()) ? 1 : 0;
    return {
      ...r,
      amount_paid,
      balance,
      overdue,
      total_base, amount_paid_base: paid_base, balance_base,
      client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null,
      created_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
      // ---- Back-compat aliases for existing UI columns
      paid: amount_paid,                         // UI "Paid"
      recorded_by: r.created_by_name || '',      // UI "Recorded By"
      created: r.created_at                      // UI "Created"
    };
  });
  res.json(rows);
});

app.get('/api/invoices/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  const inv = getOne(db, `
    SELECT
      i.*,
      (SELECT COALESCE(SUM(p.amount * COALESCE(p.rate_to_base, i.rate_to_base)),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid_base,
      (SELECT COALESCE(SUM(p.amount * COALESCE(p.rate_to_base, i.rate_to_base) / NULLIF(i.rate_to_base,0)),0) FROM payments p WHERE p.invoice_id = i.id) AS amount_paid_in_inv,
      c.id AS client_id, c.name AS client_name, c.email AS client_email,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    LEFT JOIN users u ON u.id = i.created_by
    WHERE i.id = ?
  `, [id]);
  if (!inv) return res.status(404).json({ error:'not found' });

  const pays = query(db, `
    SELECT
      p.*,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email
    FROM payments p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.invoice_id = ?
    ORDER BY p.id DESC
  `, [id]).map(p => ({
    ...p,
    recorded_by_user: p.created_by_id ? { id:p.created_by_id, name:p.created_by_name, email:p.created_by_email } : null,
    // Back-compat alias
    recorded_by: p.created_by_name || ''
  }));

  const total_base = Number(inv.total||0) * coalesceRate(inv.rate_to_base);
  const amount_paid_base = Number(inv.amount_paid_base||0);
  const balance_base = total_base - amount_paid_base;
  const amount_paid = Number(inv.amount_paid_in_inv||0);
  const balance = Number(inv.total||0) - amount_paid;

  res.json({
    ...inv,
    amount_paid,
    balance,
    total_base, amount_paid_base, balance_base,
    client: inv.client_id ? { id:inv.client_id, name:inv.client_name, email:inv.client_email } : null,
    created_by_user: inv.created_by_id ? { id:inv.created_by_id, name:inv.created_by_name, email:inv.created_by_email } : null,
    // Back-compat alias for header area
    recorded_by: inv.created_by_name || '',
    payments: pays
  });
});

app.post('/api/invoices', auth, (req,res)=>{
  const { client_id, title, description, total, due_date, created_at, currency_code, rate_to_base } = req.body || {};
  if (!client_id || !(Number(total) > 0)) return res.status(400).json({ error:'client_id and total required' });
  const createdBy = req.user?.id || null;
  const code = (currency_code || getBaseCurrency() || 'GHS').toUpperCase();
  const rate = coalesceRate(rate_to_base || 1);
  run(db, `INSERT INTO invoices(client_id,title,description,total,due_date,created_at,created_by,currency_code,rate_to_base)
           VALUES(?,?,?,?,?,?,?,?,?)`,
    [ Number(client_id), title||'', description||'', Number(total), due_date||null, created_at||new Date().toISOString(), createdBy, code, rate ]);
  saveDB(db);
  res.json({ ok:true });
});

app.post('/api/invoices/:id/mark-paid', auth, (req,res)=>{
  const id = Number(req.params.id);
  const inv = getOne(db, `SELECT * FROM invoices WHERE id=?`, [id]);
  if (!inv) return res.status(404).json({ error:'not found' });

  const total_base = Number(inv.total||0) * coalesceRate(inv.rate_to_base);
  const paid_base = invPaidBase(id);
  const remaining_base = total_base - paid_base;

  if (remaining_base <= 0){
    run(db, `UPDATE invoices SET status='paid' WHERE id=?`, [id]);
    saveDB(db);
    return res.json({ ok:true });
  }
  const createdBy = req.user?.id || null;
  const amount_inv_currency = remaining_base / coalesceRate(inv.rate_to_base);
  run(db, `INSERT INTO payments(invoice_id, amount, percent, method, note, created_at, created_by, currency_code, rate_to_base)
           VALUES(?,?,?,?,?,?,?,?,?)`,
    [ id, amount_inv_currency, null, 'auto', 'Auto: mark as paid', new Date().toISOString(), createdBy, inv.currency_code, coalesceRate(inv.rate_to_base) ]);
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

// ---------- Payments ----------
app.get('/api/payments', auth, (req,res)=>{
  const qs = req.query||{};
  const wh = [], pr = [];
  if (qs.invoice_id){ wh.push('p.invoice_id = ?'); pr.push(Number(qs.invoice_id)); }
  if (qs.from){ wh.push(`date(p.created_at) >= date(?)`); pr.push(qs.from); }
  if (qs.to){ wh.push(`date(p.created_at) <= date(?)`); pr.push(qs.to); }
  if (qs.client_id){ wh.push('i.client_id = ?'); pr.push(Number(qs.client_id)); }
  const where = wh.length ? ('WHERE ' + wh.join(' AND ')) : '';
  const rows = query(db, `
    SELECT
      p.*,
      u.id AS created_by_id, u.name AS created_by_name, u.email AS created_by_email,
      i.client_id AS client_id, i.currency_code AS invoice_currency_code, i.rate_to_base AS invoice_rate_to_base,
      c.name AS client_name, c.email AS client_email
    FROM payments p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN invoices i ON i.id = p.invoice_id
    LEFT JOIN clients c ON c.id = i.client_id
    ${where}
    ORDER BY p.id DESC
  `, pr).map(r => ({
    ...r,
    amount_base: Number(r.amount||0) * coalesceRate(r.rate_to_base || r.invoice_rate_to_base),
    recorded_by_user: r.created_by_id ? { id:r.created_by_id, name:r.created_by_name, email:r.created_by_email } : null,
    client: r.client_id ? { id:r.client_id, name:r.client_name, email:r.client_email } : null,
    // Back-compat alias for UI table
    recorded_by: r.created_by_name || ''
  }));
  res.json(rows);
});

app.post('/api/payments', auth, (req,res)=>{
  const { invoice_id, amount, percent, method, note, created_at, currency_code, rate_to_base } = req.body || {};
  if (!invoice_id) return res.status(400).json({ error:'invoice_id required' });
  const inv = getOne(db, `SELECT * FROM invoices WHERE id=?`, [Number(invoice_id)]);
  if (!inv) return res.status(404).json({ error:'invoice not found' });

  let amt = Number(amount)||0;
  if ((!amt || amt<=0) && percent){
    amt = (Number(inv.total||0) * Number(percent)) / 100.0;
  }
  if (!(amt>0)) return res.status(400).json({ error:'amount or percent required' });

  const createdBy = req.user?.id || null;
  const code = (currency_code || inv.currency_code || getBaseCurrency()).toUpperCase();
  const rate = coalesceRate(rate_to_base || inv.rate_to_base || 1);

  run(db, `INSERT INTO payments(invoice_id, amount, percent, method, note, created_at, created_by, currency_code, rate_to_base)
           VALUES(?,?,?,?,?,?,?,?,?)`,
    [ Number(invoice_id), amt, percent?Number(percent):null, method||'', note||'', created_at||new Date().toISOString(), createdBy, code, rate ]);

  const total_base = Number(inv.total||0) * coalesceRate(inv.rate_to_base);
  const paid_base = invPaidBase(Number(invoice_id));
  const newStatus = paid_base >= total_base ? 'paid' : (paid_base>0 ? 'part-paid' : 'pending');
  run(db, `UPDATE invoices SET status=? WHERE id=?`, [newStatus, Number(invoice_id)]);

  saveDB(db);
  res.json({ ok:true });
});

app.delete('/api/payments/:id', auth, (req,res)=>{
  const id = Number(req.params.id);
  const row = getOne(db, `SELECT * FROM payments WHERE id=?`, [id]);
  if (!row) return res.status(404).json({ error:'not found' });

  run(db, `DELETE FROM payments WHERE id=?`, [id]);

  const inv = getOne(db, `SELECT * FROM invoices WHERE id=?`, [row.invoice_id]);
  if (inv){
    const total_base = Number(inv.total||0) * coalesceRate(inv.rate_to_base);
    const paid_base = invPaidBase(Number(row.invoice_id));
    const newStatus = paid_base >= total_base ? 'paid' : (paid_base>0 ? 'part-paid' : 'pending');
    run(db, `UPDATE invoices SET status=? WHERE id=?`, [newStatus, row.invoice_id]);
  }

  saveDB(db);
  res.json({ ok:true });
});

// ---------- Client Statement ----------
app.get('/api/clients/:id/statement', auth, (req, res) => {
  const raw = String(req.params.id || '').trim();
  if (!/^\d+$/.test(raw)) return res.status(400).json({ error: 'invalid client id' });
  const clientId = Number(raw);

  const client = getOne(db, `SELECT id, name, email, phone FROM clients WHERE id=?`, [clientId]);
  if (!client) return res.status(404).json({ error: 'client not found' });

  const invoices = query(db, `
    SELECT id, title, description, total, created_at, due_date, currency_code, rate_to_base
    FROM invoices WHERE client_id = ?
    ORDER BY datetime(COALESCE(created_at, due_date)) ASC
  `, [clientId]);

  const payments = query(db, `
    SELECT p.id, p.amount, p.percent, p.method, p.note, p.created_at, p.invoice_id, p.currency_code, p.rate_to_base
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    WHERE i.client_id = ?
    ORDER BY datetime(p.created_at) ASC
  `, [clientId]);

  const entries = [];
  for (const i of invoices){
    entries.push({
      type: 'Invoice',
      ref: i.id,
      date: i.created_at || i.due_date || null,
      description: i.title || i.description || '',
      amount: Number(i.total || 0),
      amount_base: Number(i.total || 0) * coalesceRate(i.rate_to_base),
      currency_code: i.currency_code,
      invoice_id: i.id
    });
  }
  for (const p of payments){
    entries.push({
      type: 'Payment',
      ref: p.id,
      date: p.created_at || null,
      description: p.note || p.method || '',
      amount: -Number(p.amount || 0),
      amount_base: -Number(p.amount || 0) * coalesceRate(p.rate_to_base),
      currency_code: p.currency_code,
      invoice_id: p.invoice_id || null
    });
  }

  entries.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    if (ad !== bd) return ad - bd;
    if (a.type === b.type) return 0;
    return a.type === 'Invoice' ? -1 : 1;
  });

  let running = 0, running_base = 0, totalInvoiced = 0, totalPaid = 0;
  for (const e of entries){
    if (e.type === 'Invoice') totalInvoiced += Math.abs(e.amount_base);
    if (e.type === 'Payment') totalPaid += Math.abs(e.amount_base);
    running += e.amount;
    running_base += e.amount_base;
    e.running = running;
    e.running_base = running_base;
  }

  res.json({
    client,
    base_currency: getBaseCurrency(),
    totals: { invoiced_base: totalInvoiced, paid_base: totalPaid, balance_base: totalInvoiced - totalPaid },
    entries
  });
});

app.listen(PORT, ()=> console.log('Backend (users+multicurrency) running on :' + PORT));
