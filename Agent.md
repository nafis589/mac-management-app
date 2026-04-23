# 🤖 RÈGLES DE CODAGE — FRIPERIE DE LUXE

## 📍 Contexte du Projet

**Application desktop Mac** développée en 2 phases :
1. **Phase 1** : Web App (Next.js + Node.js/Express)
2. **Phase 2** : Conversion Electron

---

## 🎯 DIRECTIVE PRINCIPALE

**AVANT CHAQUE TÂCHE, TU DOIS :**

1. **Lire TASKS.md** et identifier la tâche en cours
2. **Analyser les skills requis** dans `.agents/` ou `.agent/`
3. **Appliquer les règles** de ce fichier
4. **Produire le code** conforme
5. **Marquer la tâche terminée** et passer à la suivante

**IMPORTANT :** Les durées dans TASKS.md sont indicatives. Enchaîne les tâches **immédiatement** après validation, sans attendre.

---

## 📂 ARCHITECTURE DES SKILLS

### Localisation des Skills
.agents/          # OU .agent/
├── nextjs/
├── react/
├── typescript/
├── tailwindcss/
├── nodejs/
├── express/
├── mysql/
├── electron/
└── ...
### Processus de Consultation des Skills
TÂCHE → Identifier technologies → Charger skills → Lire règles → Coder

**Exemple :**
TASK-009 : Créer products.service.js
→ Technologies : Node.js, MySQL
→ Charger : .agents/nodejs/, .agents/mysql/
→ Lire : Règles SQL, Async/Await, Transactions
→ Produire : services/products.service.js

---

## 🏗️ ARCHITECTURE PROJET

### Phase 1 : Web App
fripperie-luxe/
├── frontend/              # Next.js
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
│
├── backend/               # Node.js + Express
│   ├── config/
│   ├── services/         # ← Logique métier (ne change pas en Phase 2)
│   ├── routes/          # ← Phase 1 uniquement
│   ├── middleware/
│   ├── database/
│   ├── utils/
│   └── server.js        # ← Point d'entrée Express
│
├── .agents/             # ← Skills MCP
├── AGENTS.md            # ← Tu lis ce fichier
├── PROJECT.md
└── TASKS.md

### Phase 2 : Electron (ajouts)
├── electron/            # ← NOUVEAU
│   ├── main.js
│   ├── preload.js
│   └── ipc-handlers.js
│
├── backend/
│   ├── services/       # ← INCHANGÉ
│   ├── routes/        # ← SUPPRIMÉ
│   ├── server.js      # ← SUPPRIMÉ
│   └── index.js       # ← Export services uniquement
│
└── frontend/out/       # ← Build statique Next.js

---

## 🎯 STACK TECHNIQUE

### Phase 1
```json
{
  "frontend": {
    "framework": "Next.js 14 (App Router)",
    "ui": "Tailwind CSS + Shadcn/ui ou composant déjà créer",
    "state": "Zustand",
    "forms": "React Hook Form + Zod",
    "charts": "Recharts"
  },
  "backend": {
    "runtime": "Node.js 20+",
    "framework": "Express (Phase 1 uniquement)",
    "database": "MySQL 8.0",
    "queries": "SQL brut (PAS D'ORM)",
    "validation": "Joi",
    "auth": "bcrypt"
  }
}
```

### Phase 2
```json
{
  "desktop": "Electron (latest)",
  "frontend": "Next.js static export",
  "backend": "Services Node (sans Express)",
  "communication": "IPC (ipcMain/ipcRenderer)"
}
```

---

## 📝 STANDARDS DE CODE

### Nommage
- **Fichiers** : `kebab-case.js` / `.tsx`
- **Composants React** : `PascalCase.tsx`
- **Variables/Fonctions** : `camelCase`
- **Constantes** : `UPPER_SNAKE_CASE`

### Backend : Async/Await OBLIGATOIRE
```javascript
// ✅ CORRECT
async function getProduct(id) {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error('Product not found');
    return rows[0];
  } catch (error) {
    logger.error('getProduct error:', error);
    throw error;
  }
}

// ❌ INTERDIT : .then()/.catch()
```

### Frontend : Server Components par défaut
```tsx
// ✅ Server Component (défaut)
export default async function ProduitsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}

// ✅ Client Component (interactivité)
'use client';
export function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  // ...
}
```

---

## 🔒 SÉCURITÉ (NON-NÉGOCIABLE)

### 1. Mots de Passe
```javascript
// ✅ TOUJOURS hasher avec bcrypt (10 rounds)
const hashedPassword = await bcrypt.hash(password, 10);

// ✅ Comparer avec bcrypt.compare
const isValid = await bcrypt.compare(password, user.password);

// ❌ INTERDIT : stockage en clair
```

### 2. Requêtes SQL
```javascript
// ✅ TOUJOURS avec placeholders
db.query('SELECT * FROM products WHERE id = ?', [productId]);

// ❌ INTERDIT : concaténation
// `SELECT * FROM products WHERE id = ${id}`
```

### 3. Validation Données
```javascript
// Backend : Joi
const schema = Joi.object({
  name: Joi.string().min(2).required(),
  price: Joi.number().positive().required()
});

// Frontend : Zod
const productSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive()
});
```

---

## 🗄️ BASE DE DONNÉES

### Règles SQL

**1. Transactions pour opérations multiples**
```javascript
async function createSale(saleData, items) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Opérations multiples
    await connection.query('INSERT INTO sales ...');
    for (const item of items) {
      await connection.query('INSERT INTO sale_items ...');
      await connection.query('UPDATE products SET quantity = quantity - ? ...');
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

**2. Toujours tester stock AVANT vente**
```javascript
const [product] = await connection.query(
  'SELECT quantity FROM products WHERE id = ?',
  [productId]
);

if (product[0].quantity < requestedQty) {
  throw new Error('Stock insuffisant');
}
```

**3. Index sur colonnes recherchées**
```sql
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_users_username ON users(username);
```

---

## 🔄 COMMUNICATION FRONTEND ↔ BACKEND

### Phase 1 : HTTP/REST

**Backend (Express Route)**
```javascript
// routes/products.routes.js
router.get('/', async (req, res) => {
  try {
    const products = await ProductsService.getAll(req.query);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Frontend (Fetch)**
```typescript
// lib/api.ts
export async function getProducts(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  const response = await fetch(`http://localhost:4000/api/products?${query}`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

---

### Phase 2 : IPC Electron

**Backend (Export Services)**
```javascript
// backend/index.js
module.exports = {
  init,
  products: require('./services/products.service'),
  sales: require('./services/sales.service')
  // ... tous les services
};
```

**Electron (IPC Handlers)**
```javascript
// electron/ipc-handlers.js
const { ipcMain } = require('electron');
const backend = require('../backend');

ipcMain.handle('products:getAll', async (event, filters) => {
  return await backend.products.getAll(filters);
});
```

**Frontend (IPC Wrapper)**
```typescript
// lib/api.ts
const isElectron = typeof window !== 'undefined' && (window as any).electron;

export async function getProducts(filters = {}) {
  if (isElectron) {
    return await (window as any).electron.invoke('products:getAll', filters);
  } else {
    // Fallback HTTP pour dev
    const response = await fetch('http://localhost:4000/api/products');
    return response.json();
  }
}
```

---

## 📦 GESTION FICHIERS & PHOTOS

### Upload Photos (Phase 1 : Multer)
```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/products/:id/photos', upload.array('photos', 5), async (req, res) => {
  const files = req.files;
  const photoPaths = await ProductsService.uploadPhotos(productId, files);
  res.json({ success: true, photos: photoPaths });
});
```

### Upload Photos (Phase 2 : IPC Buffers)
```javascript
ipcMain.handle('products:uploadPhotos', async (event, productId, fileBuffers) => {
  // fileBuffers = [{name, buffer}, ...]
  return await backend.products.uploadPhotos(productId, fileBuffers);
});
```

### Service Upload (identique Phase 1 & 2)
```javascript
async function uploadPhotos(productId, files) {
  const uploadDir = path.join(__dirname, '../uploads/products', productId);
  fs.mkdirSync(uploadDir, { recursive: true });
  
  const photoPaths = [];
  
  for (const file of files) {
    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(uploadDir, filename);
    
    // Écrire sur disque
    fs.writeFileSync(filepath, file.buffer);
    
    // Compresser si > 800px (utiliser sharp)
    
    photoPaths.push(`/uploads/products/${productId}/${filename}`);
  }
  
  // UPDATE products SET photos = JSON
  await db.query(
    'UPDATE products SET photos = ? WHERE id = ?',
    [JSON.stringify(photoPaths), productId]
  );
  
  return photoPaths;
}
```

---

## 🧪 TESTS

### Backend (Jest)
```javascript
describe('ProductService', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM products');
  });

  it('should create a product', async () => {
    const product = await ProductService.create({
      name: 'Test Product',
      reference: 'TEST-001',
      sale_price: 100
    });
    expect(product.id).toBeDefined();
  });
});
```

### Frontend (Testing Library)
```tsx
import { render, screen } from '@testing-library/react';

test('displays product name', () => {
  const product = { name: 'Sac Gucci', price: 50000 };
  render(<ProductCard product={product} />);
  expect(screen.getByText('Sac Gucci')).toBeInTheDocument();
});
```

---

## 🚫 INTERDICTIONS STRICTES

### Modules Interdits
- ❌ **Sequelize, TypeORM, Prisma** → SQL brut uniquement
- ❌ **Redux** → Utiliser Zustand
- ❌ **Mongoose** → MySQL imposé

### Pratiques Interdites
```javascript
// ❌ SQL injection
const query = `SELECT * FROM products WHERE id = ${id}`;

// ❌ Passwords en clair
UPDATE users SET password = '123456';

// ❌ .then()/.catch()
db.query('...').then(result => ...).catch(err => ...);

// ❌ console.log en production
console.log('Debug info');  // Utiliser logger.info()
```

---

## ✅ CHECKLIST AVANT CHAQUE COMMIT

**Backend**
- [ ] Requêtes SQL avec placeholders
- [ ] Try/catch partout
- [ ] Validation Joi des entrées
- [ ] Logs avec logger (pas console.log)
- [ ] Mots de passe hashés bcrypt

**Frontend**
- [ ] Gestion erreurs fetch/IPC
- [ ] Loading states
- [ ] Validation Zod formulaires
- [ ] Types TypeScript corrects
- [ ] Accessibilité (aria-labels)

---

## 🔧 CONFIGURATION SPÉCIALE

### Next.js Static Export (Phase 2)
```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true
};
```

### Electron Builder (Phase 2)
```json
// electron-builder.json
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

## 📊 CONSTANTS PROJET

```javascript
// config/constants.js
module.exports = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000,
  MAX_PHOTOS_PER_PRODUCT: 5,
  PHOTO_MAX_WIDTH: 800,
  DEFAULT_MIN_STOCK: 2,
  DEFAULT_PAGE_SIZE: 50,
  SALE_REFERENCE_PREFIX: 'VTE',
  PRODUCT_REFERENCE_PREFIX: 'PRD',
  BACKUP_INTERVAL_MS: 60 * 60 * 1000,
  
  ROLES: { ADMIN: 'ADMIN', CASHIER: 'CASHIER' },
  STATUS: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' },
  CONDITIONS: { EXCELLENT: 'EXCELLENT', VERY_GOOD: 'VERY_GOOD', GOOD: 'GOOD' },
  MOVEMENT_TYPES: { IN: 'IN', OUT: 'OUT' },
  DISCOUNT_TYPES: { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' }
};
```

---

## 🎯 WORKFLOW AGENT

Lire TASKS.md → Identifier tâche courante (ex: TASK-009)
Lire description tâche → Identifier technologies (Node.js, MySQL)
Charger skills → .agents/nodejs/, .agents/mysql/
Lire règles skills → SQL préparées, async/await
Appliquer règles AGENTS.md → Validation, logs, gestion erreurs
Produire code → Fichier complet prêt à copier-coller
Marquer ✅ dans TASKS.md
Passer immédiatement à TASK-010 (sans attendre)


---

## 📚 RESSOURCES RÉFÉRENCE

- **Next.js** : https://nextjs.org/docs
- **React** : https://react.dev/
- **Tailwind** : https://tailwindcss.com/docs
- **Shadcn** : https://ui.shadcn.com/
- **Electron** : https://www.electronjs.org/docs
- **MySQL** : https://dev.mysql.com/doc/

---

## 🔥 EXEMPLES CRITIQUES

### Exemple 1 : Création Vente avec Transaction

```javascript
// services/sales.service.js
async function createSale(saleData, items) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Générer référence
    const reference = await generateReference(); // VTE-20260419-001
    
    // 2. INSERT sale
    const [saleResult] = await connection.query(
      'INSERT INTO sales (reference, total_amount, final_amount, cashier_id) VALUES (?, ?, ?, ?)',
      [reference, saleData.totalAmount, saleData.finalAmount, saleData.cashierId]
    );
    
    const saleId = saleResult.insertId;
    
    // 3. Pour chaque produit
    for (const item of items) {
      // a. Vérifier stock
      const [product] = await connection.query(
        'SELECT quantity FROM products WHERE id = ?',
        [item.productId]
      );
      
      if (product[0].quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour produit ${item.productId}`);
      }
      
      // b. INSERT sale_items
      await connection.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [saleId, item.productId, item.quantity, item.unitPrice]
      );
      
      // c. UPDATE products (décrémenter stock)
      await connection.query(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
      
      // d. INSERT stock_movements
      await connection.query(
        'INSERT INTO stock_movements (product_id, type, quantity, user_id) VALUES (?, ?, ?, ?)',
        [item.productId, 'OUT', item.quantity, saleData.cashierId]
      );
    }
    
    await connection.commit();
    return { success: true, saleId, reference };
    
  } catch (error) {
    await connection.rollback();
    logger.error('createSale error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
```

### Exemple 2 : Login avec Verrouillage

```javascript
// services/auth.service.js
async function login(username, password) {
  try {
    // 1. Vérifier verrouillage
    const isLocked = await checkLockout(username);
    if (isLocked) {
      throw new Error('Compte verrouillé (5 tentatives). Réessayez dans 5 min.');
    }
    
    // 2. SELECT user
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? AND status = ?',
      [username, 'ACTIVE']
    );
    
    if (users.length === 0) {
      await logFailedAttempt(username);
      return null;
    }
    
    const user = users[0];
    
    // 3. Vérifier password avec bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      await logFailedAttempt(username);
      return null;
    }
    
    // 4. Succès → log + retour
    await db.query(
      'INSERT INTO logs (user_id, action) VALUES (?, ?)',
      [user.id, 'LOGIN']
    );
    
    delete user.password; // Ne JAMAIS retourner le hash
    return user;
    
  } catch (error) {
    logger.error('login error:', error);
    throw error;
  }
}

async function checkLockout(username) {
  const [logs] = await db.query(
    `SELECT COUNT(*) as attempts 
     FROM logs 
     WHERE action = 'LOGIN_FAILED' 
     AND details LIKE ?
     AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    [`%${username}%`]
  );
  
  return logs[0].attempts >= 5;
}
```

---

## 🎨 DESIGN SYSTEM

### Tailwind Config
```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        luxury: {
          black: '#0A0A0A',
          anthracite: '#2B2B2B',
          gold: '#D4AF37',
          champagne: '#F7E7CE'
        }
      },
      fontFamily: {
        elegant: ['Cormorant Garamond', 'serif'],
        sans: ['Inter', 'sans-serif']
      }
    }
  }
}
```

---

## 🚀 FIN DU FICHIER

**RAPPEL FINAL :**

1. ✅ Charger skills pertinents (`.agents/`)
2. ✅ Respecter règles sécurité (SQL, bcrypt)
3. ✅ Try/catch partout
4. ✅ Logs avec logger
5. ✅ Validation données (Joi/Zod)
6. ✅ Tests après chaque service
7. ✅ Enchaîner tâches sans délai
8. ✅ Marquer progression dans TASKS.md

**Questions ?** → Relis PROJECT.md pour architecture complète