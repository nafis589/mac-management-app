/**
 * Backend Entry Point — Phase 2 Electron
 * 
 * Exporte tous les services métier directement (sans Express).
 * Utilisé par les IPC handlers d'Electron pour appeler la logique métier.
 */

import pool from './config/database.js';
import logger from './utils/logger.js';
import { AuthService } from './services/auth.service.js';
import { productsService } from './services/products.service.js';
import { stockService } from './services/stock.service.js';
import { salesService } from './services/sales.service.js';
import { UsersService } from './services/users.service.js';
import { reportsService } from './services/reports.service.js';
import { categoriesService } from './services/categories.service.js';
import { brandsService } from './services/brands.service.js';

/**
 * Initialise la connexion à la base de données.
 * Doit être appelé au démarrage de l'application Electron.
 * @returns {Promise<boolean>} true si la connexion est établie avec succès
 */
async function init(): Promise<boolean> {
  try {
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
