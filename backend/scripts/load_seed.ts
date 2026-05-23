import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSeed() {
  console.log('Loading seed...');
  const seedPath = path.join(__dirname, '../database/seeds/999_performance_test.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');
  
  const statements = sql.split(/;\s*$/m).filter(stmt => stmt.trim().length > 0);
  
  const connection = await pool.getConnection();
  try {
    // Some basic chunking to not overwhelm the driver, or execute one by one
    for (const stmt of statements) {
       if (stmt.trim()) {
           await connection.query(stmt);
       }
    }
    console.log('Seed loaded successfully.');
  } catch(e) {
    console.error('Error loading seed', e);
  } finally {
    connection.release();
    process.exit(0);
  }
}

loadSeed();
