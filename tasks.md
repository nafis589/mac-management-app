# 📝 TÂCHES MODULE LIVRAISONS

## 🔍 PHASE 0 : OPTIMISATIONS PRÉALABLES (1 jour)

### TASK-PERF-001 : Audit Performance Existant
**Priorité** : CRITIQUE  
**Durée** : 2h

**Description :**
Teste la fluidité de l'app avec beaucoup de données.

**Actions :**
1. Script seed : Générer 10 000 produits + 5 000 ventes
2. Tester :
   - Temps chargement page Produits
   - Temps recherche produit
   - Temps ouverture POS
   - Temps validation vente
3. Si > 2 secondes → Optimiser AVANT livraisons

**Outils :**
```bash
# Frontend
console.time('load-products');
// ... fetch
console.timeEnd('load-products');

# Backend (IPC)
const start = performance.now();
// ... query
console.log(`Query took ${performance.now() - start}ms`);
```

**Critères validation :**
- Chargement page < 1s
- Recherche < 500ms
- Validation vente < 2s

---

### TASK-PERF-002 : Ajouter Indexes Manquants
**Priorité** : HAUTE  
**Durée** : 30min

**Description :**
Vérifie et ajoute indexes sur tables actuelles.

**Schema à vérifier :**
```sql
-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_reference ON products(reference);

-- Sales
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);

-- Stock movements
CREATE INDEX idx_stock_product ON stock_movements(product_id);
CREATE INDEX idx_stock_date ON stock_movements(created_at);
```

**Test :**
```sql
EXPLAIN SELECT * FROM products WHERE category_id = 1;
-- Doit utiliser l'index
```

---

### TASK-PERF-003 : Implémenter Pagination Produits
**Priorité** : HAUTE  
**Durée** : 1h

**Backend :**
```javascript
// services/products.service.js
async function getAll(filters = {}) {
  const { page = 1, limit = 50, search, category_id } = filters;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM products WHERE status = "ACTIVE"';
  let params = [];
  
  if (search) {
    query += ' AND (name LIKE ? OR reference LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (category_id) {
    query += ' AND category_id = ?';
    params.push(category_id);
  }
  
  // Count total
  const [countResult] = await db.query(query.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
  
  // Get page
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [products] = await db.query(query, params);
  
  return {
    products,
    total: countResult[0].total,
    page,
    totalPages: Math.ceil(countResult[0].total / limit)
  };
}
```

**Frontend :**
```tsx
const [page, setPage] = useState(1);
const { products, totalPages } = await getProducts({ page });

// Pagination UI

  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent
  Page {page} / {totalPages}
  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant

```

---

---

## 📦 PHASE 1 : BACKEND LIVRAISONS (2 jours)

### ✅ TASK-DELIV-001 : Créer Table Deliveries (MODIFIÉ)
**Priorité** : CRITIQUE  
**Durée** : 30min

**Fichier :** `backend/database/migrations/002_add_deliveries.sql`

```sql
CREATE TABLE deliveries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reference VARCHAR(50) UNIQUE NOT NULL,
  sale_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  delivery_time VARCHAR(10),
  status ENUM('PENDING','IN_PROGRESS','DELIVERED','CANCELLED') DEFAULT 'PENDING',
  
  -- PAIEMENT
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
  
  notes TEXT,
  delivered_by INT,
  delivered_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (delivered_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX idx_deliveries_reference ON deliveries(reference);
CREATE INDEX idx_deliveries_payment ON deliveries(payment_status);

ALTER TABLE sales ADD COLUMN delivery_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN delivery_id INT NULL;
ALTER TABLE sales ADD FOREIGN KEY (delivery_id) REFERENCES deliveries(id);
```

---

### ✅ TASK-DELIV-002 : Service Deliveries (MODIFIÉ)
**Priorité** : CRITIQUE  
**Durée** : 3h

**Fichier :** `backend/services/deliveries.service.js`

**Fonctions :**
```javascript
async function create(deliveryData, saleId, totalAmount, amountPaid, userId)
// INSERT delivery avec :
// - total_amount (du sale)
// - amount_paid (saisi au POS)
// - payment_status calculé auto

async function getAll(filters = {})
// Filtres : status, payment_status, date_start, date_end, search
// SELECT avec colonnes : amount_due (calculée)
// Pagination

async function getById(id)
// SELECT avec total_amount, amount_paid, amount_due

async function addPayment(id, amount, userId)
// UPDATE deliveries SET amount_paid = amount_paid + ?
// Recalcul payment_status :
//   - Si amount_due = 0 → PAID
//   - Si amount_due > 0 → PARTIAL
// INSERT log (action='PAYMENT_ADDED')

async function updateStatus(id, status, userId)
// Inchangé

async function cancel(id, reason, userId)
// Inchangé

async function generateReference()
// Inchangé

async function getStats()
// Ajouter :
// - total_amount_due (SUM WHERE payment_status != 'PAID')
// - unpaid_count (COUNT WHERE payment_status = 'UNPAID')
```

---

### ✅ TASK-DELIV-003 : IPC Handlers Deliveries (MODIFIÉ)
**Priorité** : CRITIQUE  
**Durée** : 1h

**Fichier :** `electron/ipc-handlers.js`

**Ajouter :**
```javascript
ipcMain.handle('deliveries:create', async (event, deliveryData, saleId, totalAmount, amountPaid, userId) => {
  return await DeliveriesService.create(deliveryData, saleId, totalAmount, amountPaid, userId);
});

ipcMain.handle('deliveries:addPayment', async (event, id, amount, userId) => {
  return await DeliveriesService.addPayment(id, amount, userId);
});

// Autres handlers inchangés
```

---

## 🎨 PHASE 2 : FRONTEND LIVRAISONS (3 jours)

### ✅ TASK-DELIV-004 : Modifier POS - Ajouter Option Livraison (MODIFIÉ) (Remplacer le bouton attente par livraison)
**Priorité** : HAUTE  
**Durée** : 2h

**Fichier :** `app/(admin)/ventes/page.tsx`

**Modifications :**
```tsx
async function handleDeliveryOrder(deliveryData, amountPaid) {
  // 1. Créer vente
  const sale = await createSale(cart, totalPayment);
  
  // 2. Créer livraison avec paiement
  await window.electron.invoke(
    'deliveries:create',
    deliveryData,
    sale.id,
    totalPayment,      // ← Total commande
    amountPaid,        // ← Montant remis
    currentUser.id
  );
  
  const amountDue = totalPayment - amountPaid;
  if (amountDue > 0) {
    toast.warning(`Reste à payer : ${amountDue.toLocaleString()} FCFA`);
  } else {
    toast.success('Commande payée intégralement !');
  }
  
  resetCart();
}
```

---

### ✅ TASK-DELIV-005 : Composant DeliveryModal (MODIFIÉ)
**Priorité** : HAUTE  
**Durée** : 2h30

**Fichier :** `components/DeliveryModal.tsx`

**Formulaire :**
```tsx
interface Props {
  totalAmount: number; // ← Total commande
  onConfirm: (deliveryData, amountPaid) => void;
}

const [amountPaid, setAmountPaid] = useState(0);
const amountDue = totalAmount - amountPaid;

<div className="space-y-4">
  {/* Champs existants... */}
  
  <div className="border-t pt-4">
    <h3 className="font-semibold mb-2">Paiement</h3>
    
    <div className="bg-gray-50 p-3 rounded mb-3">
      <div className="flex justify-between mb-1">
        <span>Total commande :</span>
        <span className="font-bold">{totalAmount.toLocaleString()} FCFA</span>
      </div>
    </div>
    
    <label className="block mb-2 text-sm font-medium">
      Montant remis maintenant
    </label>
    <Input
      type="number"
      value={amountPaid}
      onChange={(e) => setAmountPaid(Number(e.target.value))}
      placeholder="0"
      suffix="FCFA"
    />
    <p className="text-xs text-gray-500 mt-1">
      Laissez 0 si le client paiera à la livraison
    </p>
    
    {amountDue > 0 && (
      <div className="bg-orange-50 border border-orange-200 p-3 rounded mt-3">
        <p className="text-sm font-medium text-orange-800">
          Reste à payer : {amountDue.toLocaleString()} FCFA
        </p>
        <p className="text-xs text-orange-600 mt-1">
          ⚠️ Le client devra régler ce montant à la livraison
        </p>
      </div>
    )}
    
    {amountPaid === totalAmount && (
      <div className="bg-green-50 border border-green-200 p-3 rounded mt-3">
        <p className="text-sm font-medium text-green-800">
          ✓ Commande payée intégralement
        </p>
      </div>
    )}
  </div>
  
  <div className="flex gap-2">
    <Button variant="outline" onClick={onClose}>Annuler</Button>
    <Button onClick={() => onConfirm(formData, amountPaid)}>
      Enregistrer livraison
    </Button>
  </div>
</div>
```

---

### TASK-DELIV-006 : Page Liste Livraisons (MODIFIÉ)
**Priorité** : CRITIQUE  
**Durée** : 4h30

**Fichier :** `app/(admin)/livraisons/page.tsx`

**Layout :**
```tsx
1. Stats cards (5) :
   - En attente
   - En cours
   - Livrées aujourd'hui
   - Impayées ⚠️ (payment_status = UNPAID)
   - Montant total dû (SUM amount_due WHERE payment_status != PAID)

2. Filtres :
   - Tabs statut livraison : Toutes | En attente | En cours | Livrées | Annulées
   - Tabs paiement : Toutes | Impayées | Partielles | Payées
   - Recherche + Date range

3. Tableau :
   Colonnes : 
   - Référence
   - Client | Téléphone
   - Date/Heure livraison
   - Total | Payé | Reste dû
   - Statut livraison
   - Statut paiement (badge)
   - Actions

4. Badges statut paiement :
   - UNPAID → Rouge "Non payé"
   - PARTIAL → Orange "Partiel"
   - PAID → Vert "Payé"

5. Colonne "Reste dû" :
   - Si > 0 et status=DELIVERED → Rouge gras + ⚠️
   - Si > 0 et status!=DELIVERED → Orange
   - Si = 0 → Vert ✓
```

---

### TASK-DELIV-007 : Modal Détails Livraison (MODIFIÉ)
**Priorité** : MOYENNE  
**Durée** : 3h

**Fichier :** `components/DeliveryDetailsModal.tsx`

**Sections :**
```tsx
1. Info client (inchangé)

2. Produits livrés (inchangé)

3. PAIEMENT (NOUVEAU) :
   <div className="border-t pt-4">
     <h3 className="font-semibold mb-3">💰 Paiement</h3>
     
     <div className="bg-gray-50 p-4 rounded space-y-2">
       <div className="flex justify-between">
         <span>Total commande :</span>
         <span className="font-semibold">{delivery.total_amount.toLocaleString()} FCFA</span>
       </div>
       <div className="flex justify-between">
         <span>Montant payé :</span>
         <span className="text-green-600 font-semibold">{delivery.amount_paid.toLocaleString()} FCFA</span>
       </div>
       <div className="border-t pt-2 flex justify-between text-lg font-bold">
         <span>Reste dû :</span>
         <span className={delivery.amount_due > 0 ? 'text-red-600' : 'text-green-600'}>
           {delivery.amount_due.toLocaleString()} FCFA
           {delivery.amount_due === 0 && ' ✓'}
         </span>
       </div>
     </div>
     
     {delivery.amount_due > 0 && (
       <div className="mt-4">
         <label className="block text-sm font-medium mb-2">
           Encaisser le reste (ou partie)
         </label>
         <div className="flex gap-2">
           <Input
             type="number"
             value={paymentAmount}
             onChange={(e) => setPaymentAmount(Number(e.target.value))}
             placeholder="Montant reçu"
             max={delivery.amount_due}
           />
           <Button onClick={handleAddPayment}>
             Encaisser
           </Button>
         </div>
       </div>
     )}
   </div>

4. Statut actuel (inchangé)

5. Boutons (inchangé)
```

**Fonction encaissement :**
```tsx
async function handleAddPayment() {
  if (paymentAmount <= 0 || paymentAmount > delivery.amount_due) {
    toast.error('Montant invalide');
    return;
  }
  
  await window.electron.invoke('deliveries:addPayment', delivery.id, paymentAmount, currentUser.id);
  
  toast.success(`${paymentAmount.toLocaleString()} FCFA encaissé`);
  
  // Refresh delivery
  loadDelivery(delivery.id);
}
```

---

### TASK-DELIV-008 : Génération Bon de Livraison PDF (MODIFIÉ)
**Priorité** : MOYENNE  
**Durée** : 2h

**Fichier :** `lib/delivery-slip-generator.ts`

**Template PDF :**
┌─────────────────────────────────────┐
│ BON DE LIVRAISON                    │
│ Friperie de Luxe                    │
├─────────────────────────────────────┤
│ Réf : LIV-20260522-001              │
│ Date : 22 mai 2026                  │
├─────────────────────────────────────┤
│ CLIENT                              │
│ Nom : Kofi Mensah                   │
│ Tél : +228 90 12 34 56              │
│ Adresse : Rue X, Quartier Y         │
│ Livraison prévue : 22/05 14h-16h    │
├─────────────────────────────────────┤
│ ARTICLES À LIVRER                   │
│ 1x Sac Louis Vuitton   450 000 F    │
│ 1x Lunettes Gucci      120 000 F    │
│                                     │
│ TOTAL COMMANDE : 570 000 FCFA       │
│ MONTANT PAYÉ :   200 000 FCFA       │
│ ─────────────────────────────────   │
│ RESTE À PAYER :  370 000 FCFA ⚠️    │
├─────────────────────────────────────┤
│ Signature livreur :                 │
│                                     │
│ Signature client :                  │
│ (+ règlement si reste dû)           │
│                                     │
└─────────────────────────────────────┘
---

### TASK-DELIV-009 à 011 : Inchangées

---

## 📊 PHASE 4 : RAPPORT JOURNALIER (NOUVEAU)

### TASK-REPORT-001 : Modifier Rapport Journalier
**Priorité** : MOYENNE  
**Durée** : 1h

**Fichier :** `backend/services/reports.service.js`

**Modifier getDailyReport() :**
```javascript
async function getDailyReport(date) {
  const [result] = await db.query(`
    SELECT 
      COUNT(DISTINCT s.id) as nb_sales,
      SUM(s.final_amount) as total_revenue,
      SUM(si.quantity * p.purchase_price) as total_purchase_cost,  -- ← NOUVEAU
      (SUM(s.final_amount) - SUM(si.quantity * p.purchase_price)) as profit
    FROM sales s
    JOIN sale_items si ON s.id = si.id
    JOIN products p ON si.product_id = p.id
    WHERE DATE(s.created_at) = ?
    AND s.cancelled_at IS NULL
  `, [date]);
  
  return {
    nb_sales: result[0].nb_sales,
    total_revenue: result[0].total_revenue,
    total_purchase_cost: result[0].total_purchase_cost,  // ← NOUVEAU
    profit: result[0].profit
  };
}
```

**Fichier :** `app/(admin)/rapports/journalier/page.tsx`

**Remplacer Card "Panier moyen" par "Coût d'achat produits" :**
```tsx
<Card className="p-4">
  <p className="text-sm text-gray-600">Coût d'achat produits vendus</p>
  <p className="text-2xl font-bold">
    {report.total_purchase_cost.toLocaleString()} FCFA
  </p>
  <p className="text-xs text-gray-500 mt-1">
    Produits vendus aujourd'hui
  </p>
</Card>
```

---

## 📊 RÉCAPITULATIF MODIFIÉ

**Total tâches :** 12 (+ TASK-REPORT-001)  
**Durée estimée :** 6-7 jours  

**Ordre strict :**
1. TASK-PERF-001 à 003 (Optimisations)
2. TASK-DELIV-001 à 003 (Backend livraisons + paiement)
3. TASK-DELIV-004 à 009 (Frontend livraisons + paiement)
4. TASK-DELIV-010 à 011 (Tests)
5. TASK-REPORT-001 (Rapport journalier)