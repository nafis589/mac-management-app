/**
 * IPC Handlers — Friperie de Luxe
 *
 * Mappe tous les canaux IPC aux méthodes des services backend.
 * Chaque handler :
 *   - Reçoit les arguments du renderer
 *   - Appelle directement le service (sans Express)
 *   - Retourne toujours { success: true, data } ou { success: false, error }
 *   - Log les erreurs via console.error
 */

const { ipcMain } = require('electron');

/**
 * Enregistre tous les IPC handlers.
 * @param {object} backend - Module backend (auth, products, stock, sales, users, reports, categories, brands)
 */
function registerHandlers(backend) {

  // ═══════════════════════════════════════════
  // AUTH (3 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('auth:login', async (_event, username, password) => {
    try {
      const data = await backend.auth.login(username, password);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] auth:login error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', async (_event, userId) => {
    try {
      const data = await backend.auth.logout(userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] auth:logout error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:resetPassword', async (_event, userId, newPassword) => {
    try {
      const data = await backend.auth.resetPassword(userId, newPassword);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] auth:resetPassword error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // PRODUCTS (8 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('products:getAll', async (_event, filters) => {
    try {
      const data = await backend.products.getAll(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:getById', async (_event, id) => {
    try {
      const data = await backend.products.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:create', async (_event, productData) => {
    try {
      const data = await backend.products.create(productData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:update', async (_event, id, productData) => {
    try {
      const data = await backend.products.update(id, productData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:update error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:delete', async (_event, id, userId) => {
    try {
      const data = await backend.products.delete(id, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:search', async (_event, term) => {
    try {
      const data = await backend.products.search(term);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:search error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:uploadPhotos', async (_event, productId, fileBuffers) => {
    try {
      // fileBuffers = [{ buffer: Buffer, originalname: string, mimetype: string }, ...]
      const data = await backend.products.uploadPhotos(productId, fileBuffers);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:uploadPhotos error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:getDeleted', async (_event) => {
    try {
      const data = await backend.products.getDeleted();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:getDeleted error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:deletePhoto', async (_event, productId, photoIndex) => {
    try {
      const data = await backend.products.deletePhoto(productId, photoIndex);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] products:deletePhoto error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // STOCK (8 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('stock:getDashboard', async (_event) => {
    try {
      const data = await backend.stock.getDashboard();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:getDashboard error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getLowStockAlerts', async (_event) => {
    try {
      const data = await backend.stock.getLowStockAlerts();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:getLowStockAlerts error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getMovements', async (_event, filters) => {
    try {
      const data = await backend.stock.getMovements(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:getMovements error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:addStock', async (_event, productId, quantity, userId, type) => {
    try {
      const data = await backend.stock.addStock(productId, quantity, userId, type);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:addStock error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:create', async (_event, movementData) => {
    try {
      const data = await backend.stock.create(movementData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:getById', async (_event, id) => {
    try {
      const data = await backend.stock.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:update', async (_event, id, movementData) => {
    try {
      const data = await backend.stock.update(id, movementData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:update error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('stock:delete', async (_event, id) => {
    try {
      const data = await backend.stock.delete(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] stock:delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // SALES (7 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('sales:createSale', async (_event, saleData, items) => {
    try {
      const data = await backend.sales.createSale(saleData, items);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:createSale error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:create', async (_event, data) => {
    try {
      const result = await backend.sales.create(data);
      return { success: true, data: result };
    } catch (error) {
      console.error('[IPC] sales:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:getHistory', async (_event, filters) => {
    try {
      const data = await backend.sales.getHistory(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:getHistory error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:getAll', async (_event, filters) => {
    try {
      const data = await backend.sales.getAll(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:getById', async (_event, id) => {
    try {
      const data = await backend.sales.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:cancel', async (_event, saleId, reason, adminId) => {
    try {
      const data = await backend.sales.cancelSale(saleId, reason, adminId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:cancel error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:generateReference', async (_event) => {
    try {
      const data = await backend.sales.generateReference();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] sales:generateReference error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // USERS (6 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('users:getAll', async (_event) => {
    try {
      const data = await backend.users.getAll();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:getById', async (_event, id) => {
    try {
      const data = await backend.users.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:create', async (_event, userData) => {
    try {
      const data = await backend.users.create(userData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:update', async (_event, id, userData) => {
    try {
      const data = await backend.users.update(id, userData);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:update error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:delete', async (_event, id, currentUserId) => {
    try {
      const data = await backend.users.deleteUser(id, currentUserId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:toggleStatus', async (_event, id) => {
    try {
      const data = await backend.users.toggleStatus(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] users:toggleStatus error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // REPORTS (6 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('reports:getDailyReport', async (_event, date) => {
    try {
      const data = await backend.reports.getDailyReport(date);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] reports:getDailyReport error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getMonthlyReport', async (_event, month, year) => {
    try {
      const data = await backend.reports.getMonthlyReport(month, year);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] reports:getMonthlyReport error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getProductReport', async (_event) => {
    try {
      const data = await backend.reports.getProductReport();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] reports:getProductReport error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:getCashierReport', async (_event, userId, startDate, endDate) => {
    try {
      const data = await backend.reports.getCashierReport(userId, startDate, endDate);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] reports:getCashierReport error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:exportToPDF', async (_event, reportData, type) => {
    try {
      const buffer = await backend.reports.exportToPDF(reportData, type);
      return { success: true, data: buffer };
    } catch (error) {
      console.error('[IPC] reports:exportToPDF error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:exportToCSV', async (_event, reportData, type) => {
    try {
      const csv = await backend.reports.exportToCSV(reportData, type);
      return { success: true, data: csv };
    } catch (error) {
      console.error('[IPC] reports:exportToCSV error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // CATEGORIES (5 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('categories:getAll', async (_event) => {
    try {
      const data = await backend.categories.getAll();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] categories:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:getById', async (_event, id) => {
    try {
      const data = await backend.categories.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] categories:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:create', async (_event, name) => {
    try {
      const data = await backend.categories.create(name);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] categories:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:update', async (_event, id, name) => {
    try {
      const data = await backend.categories.update(id, name);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] categories:update error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('categories:delete', async (_event, id) => {
    try {
      const data = await backend.categories.delete(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] categories:delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // BRANDS (5 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('brands:getAll', async (_event) => {
    try {
      const data = await backend.brands.getAll();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] brands:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('brands:getById', async (_event, id) => {
    try {
      const data = await backend.brands.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] brands:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('brands:create', async (_event, name) => {
    try {
      const data = await backend.brands.create(name);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] brands:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('brands:update', async (_event, id, name) => {
    try {
      const data = await backend.brands.update(id, name);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] brands:update error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('brands:delete', async (_event, id) => {
    try {
      const data = await backend.brands.delete(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] brands:delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // BACKUP (4 handlers — TASK-036)
  // ═══════════════════════════════════════════

  ipcMain.handle('backup:create', async (_event) => {
    try {
      if (!backend.backup) {
        return { success: false, error: 'Service backup non implémenté (voir TASK-036)' };
      }
      const data = await backend.backup.createBackup();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] backup:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore', async (_event, filePath) => {
    try {
      if (!backend.backup) {
        return { success: false, error: 'Service backup non implémenté (voir TASK-036)' };
      }
      const data = await backend.backup.restoreBackup(filePath);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] backup:restore error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:getHistory', async (_event) => {
    try {
      if (!backend.backup) {
        return { success: false, error: 'Service backup non implémenté (voir TASK-036)' };
      }
      const data = await backend.backup.getBackupHistory();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] backup:getHistory error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:scheduleAutoBackup', async (_event) => {
    try {
      if (!backend.backup) {
        return { success: false, error: 'Service backup non implémenté (voir TASK-036)' };
      }
      const data = await backend.backup.scheduleAutoBackup();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] backup:scheduleAutoBackup error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // DELIVERIES (7 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('deliveries:create', async (_event, deliveryData, cartItems, saleData, amountPaid, userId) => {
    try {
      const data = await backend.deliveries.create(deliveryData, cartItems, saleData, amountPaid, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:create error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:getAll', async (_event, filters) => {
    try {
      const data = await backend.deliveries.getAll(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:getAll error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:getById', async (_event, id) => {
    try {
      const data = await backend.deliveries.getById(id);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:getById error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:addPayment', async (_event, id, amount, userId) => {
    try {
      const data = await backend.deliveries.addPayment(id, amount, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:addPayment error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:updateStatus', async (_event, id, status, userId) => {
    try {
      const data = await backend.deliveries.updateStatus(id, status, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:updateStatus error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:cancel', async (_event, id, reason, userId) => {
    try {
      const data = await backend.deliveries.cancel(id, reason, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:cancel error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:getStats', async (_event) => {
    try {
      const data = await backend.deliveries.getStats();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:getStats error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('deliveries:getPendingCount', async (_event) => {
    try {
      const data = await backend.deliveries.getPendingCount();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] deliveries:getPendingCount error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  // BUDGET (6 handlers)
  // ═══════════════════════════════════════════

  ipcMain.handle('budget:createOrUpdate', async (_event, month, year, amount, userId) => {
    try {
      const data = await backend.budget.createOrUpdateBudget(month, year, amount, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:createOrUpdate error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:getCurrent', async (_event) => {
    try {
      const data = await backend.budget.getCurrentBudget();
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:getCurrent error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:get', async (_event, month, year) => {
    try {
      const data = await backend.budget.getBudget(month, year);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:get error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:addExpense', async (_event, dataObj, userId) => {
    try {
      const data = await backend.budget.addExpense(dataObj, userId);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:addExpense error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:getExpenses', async (_event, filters) => {
    try {
      const data = await backend.budget.getExpenses(filters);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:getExpenses error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:getStats', async (_event, month, year) => {
    try {
      const data = await backend.budget.getStats(month, year);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:getStats error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:updateExpense', async (_event, id, data, userId) => {
    try {
      const result = await backend.budget.updateExpense(id, data, userId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[IPC] budget:updateExpense error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:deleteExpense', async (_event, id, userId) => {
    try {
      const result = await backend.budget.deleteExpense(id, userId);
      return { success: true, data: result };
    } catch (error) {
      console.error('[IPC] budget:deleteExpense error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('budget:getDailyExpenses', async (_event, month, year) => {
    try {
      const data = await backend.budget.getDailyExpenses(month, year);
      return { success: true, data };
    } catch (error) {
      console.error('[IPC] budget:getDailyExpenses error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════
  console.log('📡 IPC handlers enregistrés : 65 canaux');
}

module.exports = { registerHandlers };
