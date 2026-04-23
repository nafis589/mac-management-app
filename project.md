# 📋 PROJECT OVERVIEW — FRIPERIE DE LUXE

## 🎯 Description

Application de gestion pour boutique de friperie de luxe, développée en 2 phases :
- **Phase 1** : Web App (Next.js + Node/Express)
- **Phase 2** : Conversion Desktop Mac (Electron)

---

## 🏗️ Architecture

### Phase 1 : Web Application
Frontend (Next.js)          Backend (Node/Express)
Port 3000                   Port 4000
│                            │
│────── HTTP/REST ──────────>│
│        fetch API            │
│                             │
│<─────── JSON ───────────────│
### Phase 2 : Electron
┌─────────────────────────────────────┐
│     ELECTRON MAIN PROCESS           │
│  • BrowserWindow (UI)               │
│  • Backend Node intégré             │
│  • MySQL embarqué                   │
│  • IPC Handlers                     │
└──────┬─────────────────┬────────────┘
│                 │
▼                 ▼
Next.js Build     Backend Services
(Static HTML)     (Inchangés)
---

## 🗄️ Schéma Base de Données

### Tables Principales

```sql
users
├── id (PK)
├── username (UNIQUE)
├── password (hash bcrypt)
├── first_name, last_name
├── role (ENUM: 'ADMIN', 'CASHIER')
└── status (ENUM: 'ACTIVE', 'INACTIVE')

categories
├── id (PK)
└── name (UNIQUE)

brands
├── id (PK)
└── name (UNIQUE)

products
├── id (PK)
├── reference (UNIQUE)
├── name
├── category_id (FK)
├── brand_id (FK)
├── size, color
├── condition (ENUM: 'EXCELLENT', 'VERY_GOOD', 'GOOD')
├── purchase_price, sale_price
├── quantity
├── min_stock (seuil alerte)
├── description
└── photos (JSON array)

stock_movements
├── id (PK)
├── product_id (FK)
├── type (ENUM: 'IN', 'OUT')
├── quantity
├── user_id (FK)
└── created_at

sales
├── id (PK)
├── reference (UNIQUE) -- VTE-YYYYMMDD-XXX
├── total_amount
├── discount_type, discount_value
├── final_amount
├── payment_methods (JSON)
├── cashier_id (FK)
├── cancelled_at, cancel_reason
└── created_at

sale_items
├── id (PK)
├── sale_id (FK)
├── product_id (FK)
├── quantity
└── unit_price

logs
├── id (PK)
├── user_id (FK)
├── action (VARCHAR)
├── details (JSON)
└── created_at

backups
├── id (PK)
├── file_path
└── created_at
```

---

## 🔄 Flux Métier Critiques

### 1. Création Vente
Caissière scanne produit
Vérification stock disponible
Ajout au panier
Application remise (optionnel)
Sélection mode(s) paiement
TRANSACTION SQL :
a. INSERT sales
b. INSERT sale_items (chaque produit)
c. UPDATE products (décrémenter stock)
d. INSERT stock_movements (type='OUT')
Génération ticket PDF
Impression
### 2. Authentification
User saisit username/password
Vérifier verrouillage (5 tentatives max)
SELECT user WHERE username = ? AND status = 'ACTIVE'
bcrypt.compare(password, hash)
Si échec → log tentative
Si succès → INSERT log (action='LOGIN')
Retour user (sans password)
### 3. Réapprovisionnement
Admin ajoute quantité
UPDATE products SET quantity = quantity + X
INSERT stock_movements (type='IN')
Vérifier si quantity < min_stock → alerte
---

## 📂 Services Backend (Cœur Applicatif)

### auth.service.js
- `login(username, password)` → User + token
- `checkLockout(username)` → Boolean
- `resetPassword(userId, newPassword)`

### products.service.js
- `create(productData)` → INSERT + génération référence
- `getAll(filters)` → SELECT avec pagination
- `getById(id)` → SELECT avec JOIN
- `update(id, productData)`
- `delete(id)` → Soft delete + log
- `uploadPhotos(productId, files)` → Copie + resize + UPDATE JSON

### stock.service.js
- `getDashboard()` → Métriques stock
- `getLowStockAlerts()` → WHERE quantity < min_stock
- `getMovements(filters)` → Historique
- `addStock(productId, quantity, userId)`

### sales.service.js
- `createSale(saleData, items)` → **TRANSACTION COMPLÈTE**
- `cancelSale(saleId, reason, adminId)` → Restaurer stock
- `getHistory(filters)`
- `generateReference()` → VTE-YYYYMMDD-XXX

### users.service.js
- `create(userData)` → Hash password + INSERT
- `getAll()` → SELECT sans passwords
- `update(id, userData)`
- `toggleStatus(id)`

### reports.service.js
- `getDailyReport(date)` → Stats journalières
- `getMonthlyReport(month, year)`
- `getProductReport()` → Top ventes
- `getCashierReport(userId, period)`
- `exportToPDF(reportData)`
- `exportToCSV(reportData)`

### backup.service.js
- `createBackup()` → Dump DB + ZIP uploads
- `restoreBackup(filePath)`
- `scheduleAutoBackup()` → Cron 1h
- `getBackupHistory()`

---

## 🎨 Frontend Architecture

### Structure App Router
app/
├── (auth)/
│   └── login/page.tsx
├── (admin)/
│   ├── layout.tsx
│   ├── produits/
│   │   ├── page.tsx
│   │   ├── nouveau/page.tsx
│   │   └── [id]/modifier/page.tsx
│   ├── stock/page.tsx
│   ├── rapports/
│   │   ├── journalier/page.tsx
│   │   └── mensuel/page.tsx
│   └── utilisateurs/page.tsx
└── (cashier)/
└── caisse/page.tsx
### API Wrapper Adaptatif
```typescript
// lib/api.ts
const isElectron = typeof window !== 'undefined' && (window as any).electron;

export async function getProducts(filters = {}) {
  if (isElectron) {
    return await (window as any).electron.invoke('products:getAll', filters);
  } else {
    const response = await fetch('http://localhost:4000/api/products');
    return response.json();
  }
}
```

---

## 🚀 Phases de Développement

### Phase 1 : Web App (Semaines 1-6)
1. **Semaine 1** : Setup (Next.js, Express, MySQL, DB schema)
2. **Semaine 2** : Auth + Users
3. **Semaine 3** : Produits + Stock
4. **Semaine 4** : Ventes (POS)
5. **Semaine 5** : Rapports
6. **Semaine 6** : Tests + Polish

### Phase 2 : Electron (Semaines 7-8)
1. **Semaine 7** :
   - Next.js static export
   - Supprimer Express
   - Setup Electron
   - IPC handlers
2. **Semaine 8** :
   - Tests complets
   - Build .dmg Mac
   - Documentation

---

## 📦 Dépendances Clés

### Frontend
- next, react, react-dom
- tailwindcss, shadcn/ui
- zustand, react-hook-form, zod
- recharts, jspdf

### Backend
- express, cors
- mysql2, bcrypt, joi
- multer, uuid, date-fns
- archiver, pdfkit

### Electron (Phase 2)
- electron, electron-builder

---

## 🎯 Indicateurs Performance

- Démarrage app : < 10s
- Validation vente : < 2s
- Recherche produit : < 500ms
- Génération rapport : < 3s
- Capacité : 10 000 produits sans lag

---

## 🔐 Sécurité

- Passwords : bcrypt (10 rounds)
- SQL : Requêtes préparées uniquement
- Logs : Toutes actions admin tracées
- Verrouillage : 5 tentatives → lock 5 min
- Base de données : Chiffrée au repos (SQLCipher)

---

## ✅ Checklist Migration Phase 1 → 2

**Préparation**
- [ ] Web app 100% fonctionnelle
- [ ] Tous tests passent

**Next.js**
- [ ] `output: 'export'` dans next.config.js
- [ ] Build statique généré (out/)

**Backend**
- [ ] Express supprimé
- [ ] Services exportés dans index.js
- [ ] Routes Express supprimées

**Electron**
- [ ] main.js, preload.js, ipc-handlers.js créés
- [ ] Tous IPC handlers implémentés

**Frontend**
- [ ] lib/api.ts détecte environnement
- [ ] Test en mode web
- [ ] Test en mode Electron

**Build**
- [ ] electron-builder.json configuré
- [ ] .dmg généré et testé

---

## 📚 Ressources

- Next.js : https://nextjs.org/docs
- Electron : https://www.electronjs.org/docs
- MySQL : https://dev.mysql.com/doc/
- Shadcn : https://ui.shadcn.com/

---

**FIN DU DOCUMENT**