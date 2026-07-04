CREATE TABLE IF NOT EXISTS delivery_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE deliveries ADD COLUMN customer_id INTEGER
REFERENCES delivery_customers(id);

CREATE INDEX idx_customers_phone ON delivery_customers(phone);
