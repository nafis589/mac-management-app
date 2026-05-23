CREATE TABLE deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  sale_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  delivery_time TEXT,
  status TEXT CHECK(status IN ('PENDING','IN_PROGRESS','DELIVERED','CANCELLED')) DEFAULT 'PENDING',
  total_amount REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  amount_due REAL GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status TEXT CHECK(payment_status IN ('UNPAID','PARTIAL','PAID')) DEFAULT 'UNPAID',
  notes TEXT,
  delivered_by INTEGER,
  delivered_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (delivered_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_reference ON deliveries(reference);
CREATE INDEX idx_deliveries_payment ON deliveries(payment_status);

ALTER TABLE sales ADD COLUMN delivery_required INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN delivery_id INTEGER;
