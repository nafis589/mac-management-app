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
import { deliveriesService } from './services/deliveries.service.js';

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

  // 1b) Migrations: ensure deliveries table and sales delivery columns
  try {
    (pool as any).exec(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference VARCHAR(50) NOT NULL UNIQUE,
        sale_id INTEGER NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        delivery_address TEXT,
        delivery_date DATE,
        delivery_time VARCHAR(20),
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_by INTEGER,
        delivered_by INTEGER,
        delivered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (delivered_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_deliveries_reference ON deliveries(reference);
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_deliveries_payment_status ON deliveries(payment_status);
      CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON deliveries(delivery_date);
      CREATE INDEX IF NOT EXISTS idx_deliveries_sale_id ON deliveries(sale_id);
    `);
    logger.info('Deliveries table migration ensured');
  } catch (migErr: any) {
    logger.warn('Deliveries table migration (may already exist):', migErr.message);
  }

  // Add delivery columns to sales if missing
  try {
    (pool as any).exec(`ALTER TABLE sales ADD COLUMN delivery_required INTEGER DEFAULT 0`);
    logger.info('Added delivery_required column to sales');
  } catch (e: any) {
    // Column already exists - ignore
  }
  try {
    (pool as any).exec(`ALTER TABLE sales ADD COLUMN delivery_id INTEGER`);
    logger.info('Added delivery_id column to sales');
  } catch (e: any) {
    // Column already exists - ignore
  }

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
  deliveriesService as deliveries,
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
  deliveries: deliveriesService,
};
