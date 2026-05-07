import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Détection de l'environnement Electron (via les arguments ou process.versions)
const isElectron = !!process.versions?.electron || process.env.IS_ELECTRON === 'true';

let pool: any;

if (isElectron) {
  // Mode Electron : SQLite
  
  // Chemin relatif dans l'app ou chemin utilisateur défini par main.js
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../friperie_luxe.db');
  console.log('[DATABASE] Resolved SQLite dbPath:', dbPath);
  const db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const executeQuery = (sql: string, params: any[] = []) => {
    try {
      // Basic translation for MySQL -> SQLite compatibility
      let adaptedSql = sql.replace(/FOR UPDATE/gi, '');
      
      const isSelect = adaptedSql.trim().toUpperCase().startsWith('SELECT') || adaptedSql.trim().toUpperCase().startsWith('WITH');
      const stmt = db.prepare(adaptedSql);
      
      if (isSelect) {
        const rows = stmt.all(...params);
        return [rows, []];
      } else {
        const info = stmt.run(...params);
        return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, []];
      }
    } catch (err: any) {
      console.error('[DATABASE ERROR]', err.message, '\nSQL:', sql, '\nPARAMS:', params);
      throw err;
    }
  };

  pool = {
    isSQLite: true,
    query: async (sql: string, params: any[] = []) => {
      return executeQuery(sql, params);
    },
    /**
     * Exécute un script SQL multi-statements (CREATE TABLE, etc.)
     * Utilisé pour initialiser le schéma SQLite au premier lancement.
     */
    exec: (sql: string) => {
      return db.exec(sql);
    },
    getConnection: async () => {
      return {
        query: async (sql: string, params: any[] = []) => executeQuery(sql, params),
        beginTransaction: async () => executeQuery('BEGIN TRANSACTION'),
        commit: async () => executeQuery('COMMIT'),
        rollback: async () => executeQuery('ROLLBACK'),
        release: () => {}
      };
    }
  };

  logger.info('Connected to SQLite database successfully (Electron mode)');
} else {
  // Mode Web : MySQL
  const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'friperie_luxe',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  if (process.env.NODE_ENV !== 'test') {
    mysqlPool.getConnection()
      .then((conn) => {
        logger.info('Connected to MySQL database successfully (Web mode)');
        conn.release();
      })
      .catch((err) => {
        logger.error('Database connection failed', err);
      });
  }

  pool = mysqlPool;
  pool.isSQLite = false;
}

export default pool;
