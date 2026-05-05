import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('Starting migration from MySQL to SQLite...');

  // 1. Connect to MySQL
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'friperie_luxe',
  });
  console.log('Connected to MySQL.');

  // 2. Connect to SQLite
  const sqliteDbPath = path.join(__dirname, '../../friperie_luxe.db');
  if (fs.existsSync(sqliteDbPath)) {
    console.log(`Removing existing SQLite database at ${sqliteDbPath}`);
    fs.unlinkSync(sqliteDbPath);
  }
  const sqliteDb = new Database(sqliteDbPath);
  console.log('Connected to SQLite.');

  // 3. Create schema
  const schemaPath = fs.existsSync(path.join(__dirname, '../database/schema-sqlite.sql')) 
    ? path.join(__dirname, '../database/schema-sqlite.sql')
    : path.join(__dirname, '../../database/schema-sqlite.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  sqliteDb.exec(schemaSql);
  console.log('SQLite schema created.');

  // Disable foreign keys during migration to avoid insertion order issues
  sqliteDb.pragma('foreign_keys = OFF');

  const tables = [
    'users',
    'categories',
    'brands',
    'products',
    'stock_movements',
    'sales',
    'sale_items',
    'logs',
    'backups'
  ];

  for (const table of tables) {
    console.log(`Migrating table ${table}...`);
    const [rows]: any = await mysqlConn.query(`SELECT * FROM ${table}`);
    
    if (rows.length === 0) {
      console.log(`No data in ${table}, skipping.`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    
    const insertStmt = sqliteDb.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    );

    const transaction = sqliteDb.transaction((rowsToInsert: any[]) => {
      for (const row of rowsToInsert) {
        const values = columns.map(col => {
          let val = row[col];
          // MySQL driver returns Dates for DATETIME columns.
          // Convert to string format 'YYYY-MM-DD HH:MM:SS' for SQLite
          if (val instanceof Date) {
            return val.toISOString().slice(0, 19).replace('T', ' ');
          }
          // Convert objects/arrays to JSON strings
          if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
          }
          return val;
        });
        insertStmt.run(values);
      }
    });

    transaction(rows);
    console.log(`Migrated ${rows.length} rows to ${table}.`);
  }

  // Re-enable foreign keys
  sqliteDb.pragma('foreign_keys = ON');

  await mysqlConn.end();
  sqliteDb.close();
  
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
