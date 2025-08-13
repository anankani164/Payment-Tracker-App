CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT, phone TEXT, company TEXT, notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  title TEXT, description TEXT,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  amount_paid REAL DEFAULT 0,
  due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  percent REAL, method TEXT, note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
