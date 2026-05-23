const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'friperie_luxe.db');
const db = new Database(dbPath);

const sqlPath = path.join(__dirname, 'database/migrations/003_fix_deliveries_logic.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  db.exec(sql);
  console.log("Migration 003_fix_deliveries_logic.sql executed successfully!");
} catch (e) {
  console.error("Migration error:", e.message);
}
