import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'friperie_luxe.db');
const db = new Database(dbPath);

console.log("Checking schema...");
const rows = db.pragma('table_info(deliveries)');
console.log(rows);
