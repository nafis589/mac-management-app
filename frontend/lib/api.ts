/**
 * API Layer — Friperie de Luxe
 *
 * Couche d'abstraction entre le frontend et le backend.
 * Détecte automatiquement l'environnement :
 *   - Electron → appels IPC via window.electron.invoke()
 *   - Web → appels HTTP REST via fetch()
 *
 * Chaque fonction retourne directement les données (pas de wrapper {success, data}).
 * Les erreurs sont propagées via throw.
 */

// ═══════════════════════════════════════════
// DÉTECTION ENVIRONNEMENT
// ═══════════════════════════════════════════

const isElectron = () => typeof window !== "undefined" && !!(window as any).electron;

const API_BASE = "http://localhost:4000/api";

/**
 * Helper : appel IPC ou fetch selon l'environnement.
 * En mode IPC, le résultat est déjà un objet {success, data, error}.
 * En mode HTTP, on parse le JSON et on extrait .data si présent.
 */
async function ipcInvoke(channel: string, ...args: any[]): Promise<any> {
  const result = await (window as any).electron.invoke(channel, ...args);
  if (!result.success) {
    throw new Error(result.error || "Erreur IPC inconnue");
  }
  return result.data;
}

async function httpGet(path: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function httpPost(path: string, body: any): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function httpPut(path: string, body: any): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function httpDelete(path: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

async function httpPostFormData(path: string, formData: FormData): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

// ═══════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════

/**
 * Résout le chemin d'une image (photo produit).
 * En mode Electron, le chemin est local (file://).
 * En mode Web, on préfixe avec l'URL du backend.
 */
export function resolveImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  if (isElectron()) {
    // En mode Electron, les images sont dans le dossier uploads relatif à l'app
    // TODO: adapter si nécessaire avec app.getPath('userData')
    return imagePath;
  }
  return `http://localhost:4000${imagePath}`;
}

/** Vérifie si on est en mode Electron */
export { isElectron };

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════

export async function login(
  username: string,
  password: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("auth:login", username, password);
  }
  return httpPost("/auth/login", { username, password });
}

export async function logout(userId: number): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("auth:logout", userId);
  }
  return httpPost("/auth/logout", { userId });
}

export async function resetPassword(
  userId: number,
  newPassword: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("auth:resetPassword", userId, newPassword);
  }
  return httpPost("/auth/reset-password", { userId, newPassword });
}

// ═══════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════

export async function getProducts(filters: Record<string, any> = {}): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:getAll", filters);
  }
  const query = new URLSearchParams(
    Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return httpGet(`/products${query ? `?${query}` : ""}`);
}

export async function getProductById(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:getById", id);
  }
  return httpGet(`/products/${id}`);
}

export async function createProduct(productData: any): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:create", productData);
  }
  return httpPost("/products", productData);
}

export async function updateProduct(
  id: number | string,
  productData: any
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:update", id, productData);
  }
  return httpPut(`/products/${id}`, productData);
}

export async function deleteProduct(
  id: number | string,
  userId?: number | string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:delete", id, userId);
  }
  return httpDelete(`/products/${id}?userId=${userId || ""}`);
}

export async function searchProducts(term: string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:search", term);
  }
  return httpGet(`/products?search=${encodeURIComponent(term)}`);
}

export async function uploadProductPhotos(
  productId: number | string,
  files: File[]
): Promise<any> {
  if (isElectron()) {
    // Convertir les File en buffers pour l'IPC
    const fileBuffers = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          originalname: file.name,
          mimetype: file.type,
        };
      })
    );
    return ipcInvoke("products:uploadPhotos", productId, fileBuffers);
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));
  return httpPostFormData(`/products/${productId}/photos`, formData);
}

export async function getDeletedProducts(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("products:getDeleted");
  }
  return httpGet("/products/deleted");
}

export async function deleteProductPhoto(
  productId: number | string,
  photoIndex: number
): Promise<any> {
  if (isElectron()) {
    // TODO: ajouter un canal IPC dédié si nécessaire
    return ipcInvoke("products:update", productId, {
      deletePhotoIndex: photoIndex,
    });
  }
  return httpDelete(`/products/${productId}/photos/${photoIndex}`);
}

// ═══════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════

export async function getStockDashboard(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("stock:getDashboard");
  }
  return httpGet("/stock/dashboard");
}

export async function getLowStockAlerts(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("stock:getLowStockAlerts");
  }
  return httpGet("/stock/alerts");
}

export async function getStockMovements(
  filters: Record<string, any> = {}
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("stock:getMovements", filters);
  }
  const query = new URLSearchParams(
    Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return httpGet(`/stock/movements${query ? `?${query}` : ""}`);
}

export async function addStock(
  productId: number | string,
  quantity: number,
  userId: number | string,
  type: string = "IN"
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("stock:addStock", productId, quantity, userId, type);
  }
  return httpPost("/stock", { product_id: productId, quantity, user_id: userId, type });
}

// ═══════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════

export async function createSale(
  saleData: any,
  items: any[]
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("sales:createSale", saleData, items);
  }
  return httpPost("/sales", { ...saleData, items });
}

export async function getSalesHistory(
  filters: Record<string, any> = {}
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("sales:getHistory", filters);
  }
  const query = new URLSearchParams(
    Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return httpGet(`/sales${query ? `?${query}` : ""}`);
}

export async function getSaleById(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("sales:getById", id);
  }
  return httpGet(`/sales/${id}`);
}

export async function cancelSale(
  saleId: number | string,
  reason: string,
  adminId: number | string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("sales:cancel", saleId, reason, adminId);
  }
  return httpPost(`/sales/${saleId}/cancel`, { reason, adminId });
}

// ═══════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════

export async function getUsers(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:getAll");
  }
  return httpGet("/users");
}

export async function getUserById(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:getById", id);
  }
  return httpGet(`/users/${id}`);
}

export async function createUser(userData: any): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:create", userData);
  }
  return httpPost("/users", userData);
}

export async function updateUser(
  id: number | string,
  userData: any
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:update", id, userData);
  }
  return httpPut(`/users/${id}`, userData);
}

export async function deleteUser(
  id: number | string,
  currentUserId: number | string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:delete", id, currentUserId);
  }
  return httpDelete(`/users/${id}?currentUserId=${currentUserId}`);
}

export async function toggleUserStatus(
  id: number | string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("users:toggleStatus", id);
  }
  return httpPut(`/users/${id}/toggle-status`, {});
}

// ═══════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════

export async function getDailyReport(date: string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:getDailyReport", date);
  }
  return httpGet(`/reports/daily?date=${date}`);
}

export async function getMonthlyReport(
  month: number,
  year: number
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:getMonthlyReport", month, year);
  }
  return httpGet(`/reports/monthly?month=${month}&year=${year}`);
}

export async function getProductReport(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:getProductReport");
  }
  return httpGet("/reports/products");
}

export async function getCashierReport(
  userId: number | string,
  startDate: string,
  endDate: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:getCashierReport", userId, startDate, endDate);
  }
  return httpGet(
    `/reports/cashier?userId=${userId}&startDate=${startDate}&endDate=${endDate}`
  );
}

export async function exportReportToPDF(
  reportData: any,
  type: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:exportToPDF", reportData, type);
  }
  const response = await fetch(`${API_BASE}/reports/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportData, type }),
  });
  if (!response.ok) throw new Error("Export PDF failed");
  return response.blob();
}

export async function exportReportToCSV(
  reportData: any,
  type: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("reports:exportToCSV", reportData, type);
  }
  const response = await fetch(`${API_BASE}/reports/export/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportData, type }),
  });
  if (!response.ok) throw new Error("Export CSV failed");
  return response.text();
}

// ═══════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════

export async function getCategories(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("categories:getAll");
  }
  return httpGet("/categories");
}

export async function getCategoryById(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("categories:getById", id);
  }
  return httpGet(`/categories/${id}`);
}

export async function createCategory(name: string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("categories:create", name);
  }
  return httpPost("/categories", { name });
}

export async function updateCategory(
  id: number | string,
  name: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("categories:update", id, name);
  }
  return httpPut(`/categories/${id}`, { name });
}

export async function deleteCategory(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("categories:delete", id);
  }
  return httpDelete(`/categories/${id}`);
}

// ═══════════════════════════════════════════
// BRANDS
// ═══════════════════════════════════════════

export async function getBrands(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("brands:getAll");
  }
  return httpGet("/brands");
}

export async function getBrandById(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("brands:getById", id);
  }
  return httpGet(`/brands/${id}`);
}

export async function createBrand(name: string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("brands:create", name);
  }
  return httpPost("/brands", { name });
}

export async function updateBrand(
  id: number | string,
  name: string
): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("brands:update", id, name);
  }
  return httpPut(`/brands/${id}`, { name });
}

export async function deleteBrand(id: number | string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("brands:delete", id);
  }
  return httpDelete(`/brands/${id}`);
}

// ═══════════════════════════════════════════
// BACKUP (Phase 2 - TASK-036)
// ═══════════════════════════════════════════

export async function createBackup(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("backup:create");
  }
  return httpPost("/backup/create", {});
}

export async function restoreBackup(filePath: string): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("backup:restore", filePath);
  }
  return httpPost("/backup/restore", { filePath });
}

export async function getBackupHistory(): Promise<any> {
  if (isElectron()) {
    return ipcInvoke("backup:getHistory");
  }
  return httpGet("/backup/history");
}
