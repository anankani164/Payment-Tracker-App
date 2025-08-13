
-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_at TEXT DEFAULT (DATE('now')),
  method TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- View to summarize invoice balances
CREATE VIEW IF NOT EXISTS invoice_summary AS
SELECT
  i.id as invoice_id,
  i.client_id,
  i.title,
  i.description,
  i.amount as invoice_amount,
  IFNULL(SUM(p.amount), 0) as total_paid,
  (i.amount - IFNULL(SUM(p.amount), 0)) as balance,
  CASE
    WHEN IFNULL(SUM(p.amount), 0) = 0 THEN 'pending'
    WHEN IFNULL(SUM(p.amount), 0) >= i.amount THEN 'paid'
    ELSE 'partial'
  END as status,
  i.due_date,
  i.created_at
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id;
