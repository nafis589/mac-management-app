import pool from '../config/database.js';

const indexes = [
  "CREATE INDEX idx_products_category ON products(category_id)",
  "CREATE INDEX idx_products_brand ON products(brand_id)",
  "CREATE INDEX idx_products_name ON products(name)",
  "CREATE INDEX idx_products_reference ON products(reference)",
  "CREATE INDEX idx_products_status ON products(status)",
  "CREATE INDEX idx_sales_date ON sales(created_at)",
  "CREATE INDEX idx_sales_cashier ON sales(cashier_id)",
  "CREATE INDEX idx_stock_product ON stock_movements(product_id)",
  "CREATE INDEX idx_stock_date ON stock_movements(created_at)"
];

async function run() {
  const connection = await pool.getConnection();
  try {
    for (const sql of indexes) {
      try {
        console.log(`Executing: ${sql}`);
        await connection.query(sql);
        console.log('Success.');
      } catch (err: any) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log('Index already exists (ignored).');
        } else {
          console.error(`Error executing ${sql}:`, err.message);
        }
      }
    }

    console.log('\n--- VERIFICATION ---');
    console.log('Running EXPLAIN SELECT * FROM products WHERE category_id = 1;');
    const [rows] = await connection.query('EXPLAIN SELECT * FROM products WHERE category_id = 1');
    console.log(rows);
    console.log('--------------------\n');

  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
