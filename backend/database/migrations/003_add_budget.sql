CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  planned_amount REAL NOT NULL,
  actual_expenses REAL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT CHECK(category IN (
    'STOCK_PURCHASE','EQUIPMENT','MAINTENANCE','OTHER'
  )) NOT NULL,
  source TEXT CHECK(source IN (
    'BUDGET','PERSONAL_FUNDS','LOAN','OTHER'
  )) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_budget ON expenses(budget_id);
