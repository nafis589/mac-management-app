-- Migration 005 : Simplification table expenses
-- - Suppression colonne category (plus utilisée)
-- - Suppression contrainte CHECK sur source (texte libre désormais)
-- SQLite ne supportant pas ALTER TABLE DROP COLUMN / DROP CONSTRAINT,
-- on recrée la table entièrement.

PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

CREATE TABLE expenses_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  source TEXT DEFAULT 'BUDGET',
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO expenses_new (id, budget_id, date, description, amount, source, created_by, created_at)
SELECT id, budget_id, date, description, amount, source, created_by, created_at FROM expenses;

DROP TABLE expenses;
ALTER TABLE expenses_new RENAME TO expenses;

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_budget ON expenses(budget_id);

COMMIT;
PRAGMA foreign_keys=on;
