/**
 * Electron Preload Script — Friperie de Luxe
 *
 * Expose une API sécurisée au renderer (frontend) via contextBridge.
 * Le frontend accède aux services backend via window.electron.invoke()
 *
 * Sécurité :
 * - contextIsolation: true → le renderer ne peut pas accéder à Node.js
 * - On expose uniquement invoke() avec des canaux validés
 */

const { contextBridge, ipcRenderer } = require('electron');

// Liste blanche des canaux IPC autorisés
const ALLOWED_CHANNELS = [
  // Auth
  'auth:login',
  'auth:logout',
  'auth:resetPassword',

  // Products
  'products:getAll',
  'products:getById',
  'products:create',
  'products:update',
  'products:delete',
  'products:search',
  'products:uploadPhotos',
  'products:getDeleted',

  // Stock
  'stock:getDashboard',
  'stock:getLowStockAlerts',
  'stock:getMovements',
  'stock:addStock',
  'stock:create',
  'stock:getById',
  'stock:update',
  'stock:delete',

  // Sales
  'sales:create',
  'sales:createSale',
  'sales:getHistory',
  'sales:getAll',
  'sales:getById',
  'sales:cancel',
  'sales:generateReference',

  // Users
  'users:getAll',
  'users:getById',
  'users:create',
  'users:update',
  'users:delete',
  'users:toggleStatus',

  // Reports
  'reports:getDailyReport',
  'reports:getMonthlyReport',
  'reports:getProductReport',
  'reports:getCashierReport',
  'reports:exportToPDF',
  'reports:exportToCSV',

  // Categories
  'categories:getAll',
  'categories:getById',
  'categories:create',
  'categories:update',
  'categories:delete',

  // Brands
  'brands:getAll',
  'brands:getById',
  'brands:create',
  'brands:update',
  'brands:delete',

  // Backup (Phase 2 - TASK-036)
  'backup:create',
  'backup:restore',
  'backup:getHistory',
  'backup:scheduleAutoBackup'
];

contextBridge.exposeInMainWorld('electron', {
  /**
   * Appeler un service backend via IPC.
   * @param {string} channel - Le canal IPC (ex: 'products:getAll')
   * @param {...any} args - Arguments passés au service
   * @returns {Promise<any>} Résultat du service
   */
  invoke: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`Canal IPC non autorisé: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  /** Flag pour détecter l'environnement Electron côté frontend */
  isElectron: true
});
