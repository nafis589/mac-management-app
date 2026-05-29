# TÂCHES BUDGET, RAPPELS

## PHASE 1 : BACKEND BUDGET (1 jour)

### ✅ TASK-BUDGET-001 : Tables Budget & Dépenses
**Priorité** : CRITIQUE
**Durée** : 30min

Fichier : backend/database/migrations/003_add_budget.sql

```sql
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  planned_amount REAL NOT NULL,
  actual_expenses REAL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month, year),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT CHECK(category IN (
    'STOCK_PURCHASE','EQUIPMENT','MAINTENANCE','OTHER'
  )) NOT NULL,
  source TEXT CHECK(source IN (
    'BUDGET','PERSONAL_FUNDS','LOAN','OTHER'
  )) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_budget ON expenses(budget_id);
```

---

### ✅ TASK-BUDGET-002 : Service Budget
**Priorité** : CRITIQUE
**Durée** : 2h

Fichier : backend/services/budget.service.js

Fonctions :
- createBudget(month, year, amount, userId)
- getCurrentBudget() → mois/année en cours
- getBudget(month, year)
- addExpense(data, userId) → INSERT + UPDATE actual_expenses
- getExpenses(filters) → pagination
- getStats(month, year) :
  * planned_amount
  * actual_expenses
  * remaining (planned - actual)
  * by_category (SUM GROUP BY category)
  * by_source (SUM GROUP BY source)
  * stock_purchase_total (SUM WHERE category='STOCK_PURCHASE')
  * other_expenses_total (SUM WHERE category!='STOCK_PURCHASE')

---

### ✅ TASK-BUDGET-003 : IPC Handlers Budget
**Priorité** : CRITIQUE
**Durée** : 30min

Fichier : electron/ipc-handlers.js

Ajouter :
- budget:create
- budget:getCurrent
- budget:get (month, year)
- budget:addExpense
- budget:getExpenses
- budget:getStats

---

## PHASE 2 : FRONTEND BUDGET (1.5 jours)

### TASK-BUDGET-004 : Page Budget
**Priorité** : CRITIQUE
**Durée** : 3h

Fichier : app/(admin)/budget/page.tsx
Ne créer aucun composant from scratch tous les composant dont tu auras besoin se trouve dans /frontend/components/ui

Layout :
1. Sélecteur mois/année + Bouton "Définir budget"
2. KPI (6) :
   - Budget prévu
   - Dépenses totales
   - Reste disponible (vert si > 0, rouge si < 0)
   - Dont Achat stock (STOCK_PURCHASE)
   - benefice du mois (chiffre d'affaire du mois - le cout d'achat des produit vendu du mois)
   - Coût d'achat des produits enregistrer ce mois, c'est à dire CA des produits créer ce mois
3. Bouton "Ajouter dépense"
4. Tableau dépenses paginé -utilise le même tableaux existant que dans l'onglet produits :
   Date | Description | Catégorie | Source | Montant
5. Graphique Recharts : Budget vs Dépenses réelles
Attention : pour les KPI et le Graphiques Recharts, utilise le composant store overview où il y'a les KPI à gauche le charts à droite avec les select this month et All channels, le composant se trouve dans /next-shadcn-admin-dashboard/src/app/(main)/dashboard/ecommerce

---

### TASK-BUDGET-005 : Modal Définir Budget
**Priorité** : HAUTE
**Durée** : 45min

Fichier : components/SetBudgetModal.tsx

Champs : Mois, Année, Montant budget
Validation Zod.

---

### TASK-BUDGET-006 : Modal Ajouter Dépense
**Priorité** : HAUTE
**Durée** : 1h30

Fichier : components/AddExpenseModal.tsx

Champs :
- Date
- Description
- Montant
- Catégorie (Achat stock, Équipement, Maintenance, Autre)
- Source (Budget, Fonds perso, Prêt, Autre)

Validation :
- Si source=BUDGET et remaining < amount → Warning
  "Budget insuffisant. Confirmer quand même ?"

---

### TASK-BUDGET-007 : Sidebar Onglet Budget
**Priorité** : BASSE
**Durée** : 5min

Icon : Wallet, roles : ADMIN uniquement

---

## PHASE 3 : BADGE LIVRAISONS (30min)

### TASK-REMINDER-001 : Badge Onglet Livraisons
**Priorité** : HAUTE
**Durée** : 30min

Fichier : Sidebar component

Logique badge rouge :
- Fetch au mount + toutes les 5min
- Count deliveries WHERE status IN ('PENDING','IN_PROGRESS')
  OR payment_status IN ('UNPAID','PARTIAL')
- Si count > 0 → Badge rouge sur onglet Livraisons

```tsx
useEffect(() => {
  checkPendingDeliveries();
  const interval = setInterval(checkPendingDeliveries, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);

async function checkPendingDeliveries() {
  const count = await window.electron.invoke('deliveries:getPendingCount');
  setPendingCount(count);
}

// Dans sidebar
{pendingCount > 0 && (
  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
    {pendingCount > 99 ? '99+' : pendingCount}
  </span>
)}
```

IPC handler à ajouter :
```javascript
ipcMain.handle('deliveries:getPendingCount', async () => {
  const [result] = await db.query(`
    SELECT COUNT(*) as count FROM deliveries
    WHERE status IN ('PENDING','IN_PROGRESS')
    OR payment_status IN ('UNPAID','PARTIAL')
  `);
  return result[0].count;
});
```

Ordre strict :
1. TASK-BUDGET-001 à 007 (Budget)
2. TASK-REMINDER-001 (Badge livraisons)
