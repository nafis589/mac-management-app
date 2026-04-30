# 📝 BACKLOG COMPLET — FRIPERIE DE LUXE

## 🎯 Légende
- ✅ Fait
- 🚧 En cours
- ⏳ À faire
- ⚠️ Bloqué
- 🔄 Phase 2 uniquement

---

## 📦 PHASE 1 : WEB APPLICATION (Semaines 1-6)

---

### 🔧 SEMAINE 1 : SETUP PROJET

#### TASK-001 ✅ Setup Frontend Next.js
**Priorité** : Critique  
**Durée** : 1h  
**Description** :
- `npx create-next-app@latest frontend --typescript --tailwind --app`
- Installer Shadcn/ui : `npx shadcn-ui@latest init`
- Installer dépendances : `zustand`, `react-hook-form`, `zod`, `recharts`
- Configurer Tailwind avec thème luxe (noir, or)
- Créer structure dossiers : `app/(auth)`, `app/(admin)`, `app/(cashier)`, `components/`, `lib/`

**Fichiers créés** :
- `frontend/package.json`
- `frontend/tailwind.config.ts`
- `frontend/src/app/layout.tsx`

---

#### TASK-002 ✅ Setup Backend Node.js + Express
**Priorité** : Critique  
**Durée** : 1h  
**Description** :
- Créer dossier `backend/`
- `npm init -y`
- Installer : `express`, `cors`, `mysql2`, `bcrypt`, `joi`, `uuid`, `multer`, `dotenv`
- Créer structure : `config/`, `services/`, `routes/`, `middleware/`, `database/`, `utils/`
- Créer `server.ts` avec Express de base

**Fichiers créés** :
- `backend/package.json`
- `backend/server.ts`
- `backend/.env`

---

#### TASK-003 ✅ Configuration Base de Données MySQL
**Priorité** : Critique  
**Durée** : 1.5h  
**Description** :
- Créer `config/database.ts` avec pool MySQL
- Créer `database/schema.sql` (voir schéma complet dans PROJECT.md)
- Créer `database/seeds/001_initial_data.sql` :
  - Admin par défaut (username: `admin`, password: `Admin123!`)
  - Catégories : Vêtements, Sacs, Lunettes, Casquettes, Accessoires
  - Marques de test

**Commandes** :
```bash
mysql -u root -p -e "CREATE DATABASE fripperie_luxe;"
mysql -u root -p fripperie_luxe < database/schema.sql
mysql -u root -p fripperie_luxe < database/seeds/001_initial_data.sql
```

---

#### TASK-004 ✅ Utilitaires (Logger + Constants)
**Priorité** : Moyenne  
**Durée** : 30min  
**Description** :
- Créer `utils/logger.ts` (logs dans fichier + console)
- Créer `config/constants.ts` (voir AGENTS.md pour liste complète)

---

### 🔐 SEMAINE 2 : AUTHENTIFICATION & UTILISATEURS

#### TASK-005 ✅ Service Authentification Backend
**Priorité** : Critique  
**Durée** : 3h  
**Description** :
- Créer `services/auth.service.ts`
  - `login(username, password)` : bcrypt compare, vérif verrouillage
  - `checkLockout(username)` : vérifier tentatives échouées
  - `resetPassword(userId, newPassword)`
- Créer `routes/auth.routes.ts`
  - POST `/api/auth/login`
  - POST `/api/auth/logout`
  - POST `/api/auth/reset-password`

**Tests** :
- Login succès → retourne user sans password
- Login échec → incrémente tentatives
- 5 échecs → verrouillage 5 min

---

#### TASK-006 ✅ Page Login Frontend
**Priorité** : Critique  
**Durée** : 2h  
**Description** :
- Créer `app/(auth)/login/page.tsx`
- Formulaire avec React Hook Form + Zod
- Appel API `POST /api/auth/login`
- Stockage token (localStorage ou cookie)
- Redirection selon rôle (admin → `/admin`, caissière → `/caisse`)
- Utilise exactement le formulaire qui se trouve dans frontend/loginform le      design doit être exactement le même que celui de frontend/loginform

---

#### TASK-007 ✅ Service Users Backend
**Priorité** : Haute  
**Durée** : 2.5h  
**Description** :
- Créer `services/users.service.ts`
  - `create(userData)` : hash password, INSERT
  - `getAll()` : SELECT sans passwords
  - `getById(id)`
  - `update(id, userData)`
  - `delete(id)` : soft delete (status='INACTIVE')
  - `toggleStatus(id)`
- Créer `routes/users.routes.ts`

---

#### TASK-008 ✅ Page Gestion Utilisateurs Frontend
**Priorité** : Moyenne  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/utilisateurs/page.tsx`
- Table avec liste users (Shadcn Table)
- Bouton "Nouveau" → modale formulaire
- Actions : Modifier, Activer/Désactiver, Reset password

---

### 📦 SEMAINE 3 : GESTION PRODUITS

#### TASK-009 ✅ Service Products Backend
**Priorité** : Critique  
**Durée** : 4h  
**Description** :
- Créer `services/products.service.ts`
  - `create(productData)` : génération référence auto, INSERT + stock_movements
  - `getAll(filters)` : SELECT avec pagination, JOIN categories/brands
  - `getById(id)`
  - `search(query)` : WHERE name LIKE %?% OR reference LIKE %?%
  - `update(id, productData)`
  - `delete(id)` : confirmation + log
  - `uploadPhotos(productId, files)` : copie fichiers, resize, UPDATE JSON
- Créer `routes/products.routes.ts`
- Multer pour upload photos (max 5)

---

#### TASK-010 ✅ Page Liste Produits Frontend
**Priorité** : Critique  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/produits/page.tsx`
- Grid de ProductCard avec photo, nom, prix, stock
- Barre recherche + filtres (catégorie, marque, prix)
- Bouton "Nouveau produit"

---

#### TASK-011 ✅ Formulaire Ajout/Modification Produit
**Priorité** : Critique  
**Durée** : 4h  
**Description** :
- Créer `app/(admin)/produits/nouveau/page.tsx`
- Créer `app/(admin)/produits/[id]/modifier/page.tsx`
- Formulaire complet (React Hook Form + Zod)
- Upload photos (drag & drop, preview)
- Sélection catégorie/marque (Shadcn Select)

---

### TASK-012 ✅ Service Categories & Brands Backend + Modals Frontend

**Priorité** : Moyenne  
**Durée** : 2h  

**Description** :
Crée le backend CRUD catégories/marques + modals d'ajout inline dans le formulaire produit.

**Backend :**
1. services/categories.service.ts : create, getAll, update, delete
2. services/brands.service.ts : idem
3. routes/categories.routes.ts : GET /api/categories, POST /api/categories
4. routes/brands.routes.ts : idem
5. Mise à jour server.ts

**Frontend :**
1. components/AddCategoryModal.tsx : Modal d'ajout catégorie
2. components/AddBrandModal.tsx : Modal d'ajout marque
3. Intégration dans formulaire produit (bouton ⊕ à côté des selects)

**Contraintes :**
- Validation Joi backend (name : string, min 2, unique)
- Design modal identique à l'image de référence
- Auto-refresh liste après création
- Auto-sélection nouvel élément créé

**Output :**
5 fichiers backend + 2 composants modals + modifications formulaire produit

---

### 📊 SEMAINE 4 : STOCK & VENTES

#### TASK-013 ✅ Service Stock Backend
**Priorité** : Haute  
**Durée** : 3h  
**Description** :
- Créer `services/stock.service.ts`
  - `getDashboard()` : total produits, valeur stock, alertes
  - `getLowStockAlerts()` : WHERE quantity < min_stock
  - `getMovements(filters)` : historique avec JOIN
  - `addStock(productId, quantity, userId)` : UPDATE + INSERT movement
- Créer `routes/stock.routes.ts`

---

#### TASK-014 ⏳ Page Dashboard Stock Frontend
**Priorité** : Haute  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/stock/page.tsx`
- KPIs (total produits, valeur, alertes)
- Liste produits avec quantités
- Bouton "Réapprovisionner" → modale

---

#### TASK-015 ⏳ Service Sales Backend (CRITIQUE)
**Priorité** : CRITIQUE  
**Durée** : 5h  
**Description** :
- Créer `services/sales.service.ts`
  - `createSale(saleData, items)` : **TRANSACTION COMPLÈTE**
    1. Générer référence (VTE-YYYYMMDD-XXX)
    2. INSERT sales
    3. Pour chaque item : INSERT sale_items, UPDATE products stock, INSERT stock_movements
    4. Vérifier stock disponible AVANT
    5. COMMIT ou ROLLBACK
  - `cancelSale(saleId, reason, adminId)` : UPDATE cancelled_at, restaurer stock
  - `getHistory(filters)` : pagination
  - `getSaleById(id)` : avec items
  - `generateReference()` : logique incrémentation journalière
- Créer `routes/sales.routes.ts`

**Tests critiques** :
- Vente normale → succès, stock mis à jour
- Vente stock insuffisant → rollback, erreur
- Paiement mixte → JSON correct

---

#### TASK-016 ⏳ Interface Caisse (POS) Frontend
**Priorité** : CRITIQUE  
**Durée** : 6h  
**Description** :
- Créer `app/(cashier)/caisse/page.tsx`
- Layout 2 colonnes :
  - Gauche : Liste produits + recherche
  - Droite : Panier, total, paiement
- Composants :
  - `<ProductSearch />` : recherche avec autocomplete
  - `<CartSidebar />` : panier avec quantités
  - `<PaymentModal />` : sélection mode(s) paiement, remises
- Flux complet vente → génération ticket

---

#### TASK-017 ⏳ Génération Ticket PDF
**Priorité** : Haute  
**Durée** : 2h  
**Description** :
- Installer `jspdf` ou `react-pdf`
- Créer `lib/ticket-generator.ts`
- Template ticket :
  - Logo boutique
  - Date/heure, référence vente
  - Liste articles (nom, qté, prix)
  - Total, mode paiement
- Bouton "Imprimer" dans interface caisse

---

### 📈 SEMAINE 5 : RAPPORTS & STATISTIQUES

#### TASK-018 ⏳ Service Reports Backend
**Priorité** : Haute  
**Durée** : 4h  
**Description** :
- Créer `services/reports.service.ts`
  - `getDailyReport(date)` : nb ventes, CA, paiements, bénéfice
  - `getMonthlyReport(month, year)` : évolution, comparaison mois précédent
  - `getProductReport()` : top ventes, invendus
  - `getCashierReport(userId, period)` : performance caissière
  - `exportToPDF(reportData)` : PDFKit
  - `exportToCSV(reportData)`
- Routes associées

---

#### TASK-019 ⏳ Page Rapports Journaliers Frontend
**Priorité** : Haute  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/rapports/journalier/page.tsx`
- Sélecteur de date
- KPIs (nb ventes, CA, bénéfice)
- Graphiques Recharts (CA par heure)
- Bouton export PDF

---

#### TASK-020 ⏳ Page Rapports Mensuels Frontend
**Priorité** : Haute  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/rapports/mensuel/page.tsx`
- Sélecteur mois/année
- Graphiques évolution (ligne)
- Tableau comparatif mois précédent

---

#### TASK-021 ⏳ Dashboard Analytics Principal
**Priorité** : Moyenne  
**Durée** : 3h  
**Description** :
- Créer `app/(admin)/page.tsx` (page d'accueil admin)
- Vue d'ensemble : CA du jour, ventes semaine, top 5 produits
- Graphiques widgets (camemberts, bars)

---

### 🧪 SEMAINE 6 : TESTS & POLISH PHASE 1

#### TASK-022 ⏳ Tests Unitaires Backend
**Priorité** : Haute  
**Durée** : 4h  
**Description** :
- Setup Jest : `npm install -D jest`
- Créer `backend/tests/`
  - `auth.service.test.ts`
  - `sales.service.test.ts` (critique : transactions)
  - `products.service.test.ts`
- Mock database pour tests

---

#### TASK-023 ⏳ Tests E2E Frontend
**Priorité** : Moyenne  
**Durée** : 3h  
**Description** :
- Setup Playwright ou Cypress
- Tests critiques :
  - Login → accès caisse
  - Création vente complète
  - Ajout produit
  - Génération rapport

---

#### TASK-024 ⏳ UI/UX Polish
**Priorité** : Moyenne  
**Durée** : 2h  
**Description** :
- Animations transitions (Framer Motion)
- Loading states partout (Suspense, skeletons)
- Messages erreur clairs (toast notifications)
- Accessibilité (aria-labels, focus)

---

#### TASK-025 ⏳ Documentation Utilisateur
**Priorité** : Basse  
**Durée** : 2h  
**Description** :
- Créer `docs/GUIDE_UTILISATEUR.md`
- Screenshots + explications pour chaque module
- Guide première connexion

---

## 🔄 PHASE 2 : CONVERSION ELECTRON (Semaines 7-8)

---

### 🛠️ SEMAINE 7 : PRÉPARATION ELECTRON

#### TASK-026 🔄 Configurer Next.ts Static Export
**Priorité** : Critique  
**Durée** : 1h  
**Description** :
- Modifier `frontend/next.config.ts` :
```javascript
module.exports = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true
};
```
- Build statique : `npm run build`
- Vérifier génération `frontend/out/`

---

#### TASK-027 🔄 Refactoriser Backend (Supprimer Express)
**Priorité** : Critique  
**Durée** : 2h  
**Description** :
- Supprimer dossiers : `backend/routes/`, `backend/middleware/`
- Supprimer fichier : `backend/server.ts`
- Créer `backend/index.ts` :
```javascript
module.exports = {
  init,
  auth: require('./services/auth.service'),
  products: require('./services/products.service'),
  // ... tous les services
};
```
- Désinstaller : `express`, `cors`

---

#### TASK-028 🔄 Installer & Configurer Electron
**Priorité** : Critique  
**Durée** : 1.5h  
**Description** :
- `npm install --save-dev electron electron-builder`
- Créer `electron/main.ts` (voir PROJECT.md)
- Créer `electron/preload.ts` (voir PROJECT.md)
- Créer `electron/ipc-handlers.ts` (voir PROJECT.md)
- Créer `electron-builder.json` :
```json
{
  "appId": "com.fripperie.luxe",
  "productName": "Friperie de Luxe",
  "mac": {
    "target": "dmg",
    "icon": "build/icon.icns"
  },
  "files": [
    "electron/**/*",
    "backend/**/*",
    "frontend/out/**/*"
  ]
}
```

---

#### TASK-029 🔄 Adapter Frontend pour IPC
**Priorité** : Critique  
**Durée** : 3h  
**Description** :
- Modifier `frontend/src/lib/api.ts` :
  - Ajouter détection `window.electron`
  - Pour chaque fonction API : if (isElectron) → invoke IPC, else → fetch HTTP
- Exemples :
  - `getProducts()` → `electron.invoke('products:getAll')` ou `fetch(...)`
  - `createSale()` → `electron.invoke('sales:create')` ou `fetch(...)`

---

#### TASK-030 🔄 Créer Tous les IPC Handlers
**Priorité** : Critique  
**Durée** : 4h  
**Description** :
- Dans `electron/ipc-handlers.ts`, créer handlers pour :
  - Auth : `auth:login`, `auth:logout`, `auth:resetPassword`
  - Products : `products:getAll`, `products:create`, `products:update`, `products:delete`, `products:uploadPhotos`
  - Stock : `stock:getDashboard`, `stock:getLowStockAlerts`, `stock:addStock`
  - Sales : `sales:create`, `sales:getHistory`, `sales:cancel`
  - Reports : `reports:getDailyReport`, `reports:getMonthlyReport`
  - Users : `users:getAll`, `users:create`, `users:update`
  - Backup : `backup:create`, `backup:restore`

---

#### TASK-031 🔄 MySQL Portable (Embarqué)
**Priorité** : Haute  
**Durée** : 2h  
**Description** :
- Télécharger MySQL portable pour Mac
- Configurer connexion vers DB embarquée (chemin relatif)
- Modifier `config/database.ts` pour détecter environnement
- Copier schema.sql et seeds dans package Electron

---

### 🧪 SEMAINE 8 : TESTS & BUILD ELECTRON

#### TASK-032 🔄 Tests Electron - Tous les flux
**Priorité** : Critique  
**Durée** : 4h  
**Description** :
- Lancer app Electron : `npm run electron`
- Tester TOUS les flux :
  - Login
  - Création produit + upload photos
  - Vente complète
  - Rapports
  - Sauvegarde/restauration
- Vérifier fonctionnement 100% offline (couper wifi)

---

#### TASK-033 🔄 Tests Impression Tickets
**Priorité** : Haute  
**Durée** : 2h  
**Description** :
- Brancher imprimante thermique
- Tester impression tickets depuis Electron
- Adapter format si nécessaire

---

#### TASK-034 🔄 Build Application Mac (.dmg)
**Priorité** : Critique  
**Durée** : 2h  
**Description** :
- Script package.json :
```json
{
  "scripts": {
    "build:mac": "electron-builder --mac"
  }
}
```
- Générer .dmg : `npm run build:mac`
- Icône .icns (créer avec Image2Icon)

---

#### TASK-035 🔄 Tests Installation Mac
**Priorité** : Critique  
**Durée** : 1h  
**Description** :
- Installer .dmg sur Mac propre
- Vérifier :
  - Lancement sans erreur
  - DB créée automatiquement
  - Fonctionnement offline
  - Permissions macOS (accès fichiers)

---

#### TASK-036 🔄 Service Backup Electron
**Priorité** : Haute  
**Durée** : 3h  
**Description** :
- Créer `services/backup.service.ts`
  - `createBackup()` : dump MySQL + copie dossier uploads → ZIP
  - `restoreBackup(filePath)` : extract ZIP, restore DB
  - `scheduleAutoBackup()` : cron job (toutes les heures)
- Handler IPC : `backup:create`, `backup:restore`, `backup:getHistory`

---

#### TASK-037 🔄 Page Sauvegarde Frontend
**Priorité** : Moyenne  
**Durée** : 2h  
**Description** :
- Créer `app/(admin)/sauvegardes/page.tsx`
- Bouton "Créer sauvegarde maintuelle"
- Liste des sauvegardes (nom, date, taille)
- Bouton "Restaurer" pour chaque backup

---

#### TASK-038 🔄 Documentation Technique Electron
**Priorité** : Basse  
**Durée** : 2h  
**Description** :
- Créer `docs/ELECTRON_SETUP.md`
- Expliquer architecture Electron
- Guide build .dmg
- Troubleshooting commun

---

#### TASK-039 🔄 Livraison Client
**Priorité** : Critique  
**Durée** : 2h  
**Description** :
- Package final :
  - Fichier .dmg
  - Guide utilisateur PDF
  - Guide installation PDF
- Formation 2h avec client (visio ou présentiel)

---

## 📊 RÉCAPITULATIF

### Par Priorité

**🔴 CRITIQUE (Ordre strict)**
1. TASK-001 → Setup Next.js
2. TASK-002 → Setup Backend
3. TASK-003 → Base de données
4. TASK-005 → Auth backend
5. TASK-006 → Login frontend
6. TASK-009 → Products backend
7. TASK-010 → Liste produits
8. TASK-015 → Sales backend (TRANSACTION)
9. TASK-016 → Interface caisse
10. TASK-026 → Next.js export
11. TASK-027 → Refactor backend
12. TASK-028 → Setup Electron
13. TASK-029 → Adapter frontend IPC
14. TASK-030 → IPC handlers
15. TASK-032 → Tests Electron
16. TASK-034 → Build .dmg

**🟠 HAUTE**
- TASK-007, TASK-013, TASK-014, TASK-017, TASK-018, TASK-019, TASK-020, TASK-022, TASK-031, TASK-033, TASK-036

**🟡 MOYENNE**
- TASK-004, TASK-008, TASK-012, TASK-021, TASK-023, TASK-024, TASK-037

**🟢 BASSE**
- TASK-025, TASK-038

---

## ✅ PROGRESSION GLOBALE

**Total tâches** : 39  
**Phase 1** : 25 tâches (Semaines 1-6)  
**Phase 2** : 14 tâches (Semaines 7-8)  

**Complétées** : 0  
**En cours** : 0  
**Restantes** : 39  

**Progression** : 0%

---

## 🎯 PROCHAINES ÉTAPES

