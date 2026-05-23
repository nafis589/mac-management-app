import pool from '../config/database.js';
import { productsService } from '../services/products.service.js';
import { salesService } from '../services/sales.service.js';
import { categoriesService } from '../services/categories.service.js';

async function runTests() {
  console.log('--- PERFORMANCE TESTS ---');
  
  // 1. Liste produits (50 items) - simulation en fetchant tous et truncant si pas de LIMIT dans getAll
  console.time('Liste produits (getAll sans limit/offset)');
  await productsService.getAll();
  console.timeEnd('Liste produits (getAll sans limit/offset)');

  // 2. Recherche produit
  console.time('Recherche produit');
  await productsService.search('Performance Product 500');
  console.timeEnd('Recherche produit');

  // 3. Ouverture POS
  console.time('Ouverture POS');
  await categoriesService.getAll();
  await productsService.getAll();
  console.timeEnd('Ouverture POS');

  // 4. Validation vente
  console.time('Validation vente');
  await salesService.create({
    total_amount: 50.00,
    final_amount: 50.00,
    cashier_id: 99999,
    items: [
      { productId: 10005, quantity: 1, unitPrice: 50.00 }
    ]
  });
  console.timeEnd('Validation vente');

  console.log('-------------------------');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Error during tests:', err);
  process.exit(1);
});
