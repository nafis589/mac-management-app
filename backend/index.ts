/**
 * Backend Entry Point — Phase 2 Electron
 * 
 * Exporte tous les services métier directement (sans Express).
 * Utilisé par les IPC handlers d'Electron pour appeler la logique métier.
 */

import pool from './config/database.js';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { AuthService } from './services/auth.service.js';
import { productsService } from './services/products.service.js';
import { stockService } from './services/stock.service.js';
import { salesService } from './services/sales.service.js';
import { UsersService } from './services/users.service.js';
import { reportsService } from './services/reports.service.js';
import { categoriesService } from './services/categories.service.js';
import { brandsService } from './services/brands.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureSQLiteSchemaAndSeedAdmin() {
  if (!pool.isSQLite) return;

  // 1) Ensure schema
  const schemaPath = path.join(__dirname, '../database/schema-sqlite.sql');
  if (!fs.existsSync(schemaPath)) {
    logger.error('SQLite schema file not found', { schemaPath });
    throw new Error('Schema SQLite introuvable');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  if (typeof (pool as any).exec !== 'function') {
    logger.error('SQLite pool.exec missing - cannot init schema');
    throw new Error('Initialisation SQLite impossible (exec manquant)');
  }
  (pool as any).exec(schemaSql);
  logger.info('SQLite schema ensured');

  // 2) Seed default admin if missing
  const [existing]: any = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
  if (!existing || existing.length === 0) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await pool.query(
      `INSERT INTO users (username, password, first_name, last_name, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', hashedPassword, 'Super', 'Admin', 'ADMIN', 'ACTIVE']
    );
    logger.info('Seeded default admin user');
  }
}

/**
 * Initialise la connexion à la base de données.
 * Doit être appelé au démarrage de l'application Electron.
 * @returns {Promise<boolean>} true si la connexion est établie avec succès
 */
async function init(): Promise<boolean> {
  try {
    await ensureSQLiteSchemaAndSeedAdmin();
    const connection = await pool.getConnection();
    logger.info('Backend init: connexion DB établie avec succès');
    connection.release();
    return true;
  } catch (error) {
    logger.error('Backend init: échec connexion DB', error);
    throw error;
  }
}

export {
  init,
  AuthService as auth,
  productsService as products,
  stockService as stock,
  salesService as sales,
  UsersService as users,
  reportsService as reports,
  categoriesService as categories,
  brandsService as brands,
};

export default {
  init,
  auth: AuthService,
  products: productsService,
  stock: stockService,
  sales: salesService,
  users: UsersService,
  reports: reportsService,
  categories: categoriesService,
  brands: brandsService,
};
