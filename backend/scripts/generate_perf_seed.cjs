const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../database/seeds/999_performance_test.sql');

function generateSeed() {
    console.log('Generating seed script...');
    let sql = `-- Performance Test Seed
-- 10,000 products, 5,000 sales, 20,000 stock movements

DELETE FROM stock_movements WHERE user_id = 99999;
DELETE FROM sale_items WHERE sale_id >= 10000;
DELETE FROM sales WHERE id >= 10000;
DELETE FROM products WHERE id >= 10000;
DELETE FROM brands WHERE id = 99999;
DELETE FROM categories WHERE id = 99999;
DELETE FROM users WHERE id = 99999;

`;

    // Ensure we have a user, category, and brand to associate with
    sql += `INSERT INTO users (id, username, password, role) VALUES (99999, 'perf_user', 'hashed_pass', 'ADMIN');\n`;
    sql += `INSERT INTO categories (id, name) VALUES (99999, 'Perf Category');\n`;
    sql += `INSERT INTO brands (id, name) VALUES (99999, 'Perf Brand');\n\n`;

    console.log('Generating 10,000 products...');
    for (let i = 1; i <= 10000; i++) {
        sql += `INSERT INTO products (id, reference, name, category_id, brand_id, \`condition\`, sale_price, quantity, min_stock, status) VALUES (${i + 10000}, 'PERF_PROD_${i}', 'Performance Product ${i}', 99999, 99999, 'GOOD', 50.00, 10, 2, 'ACTIVE');\n`;
    }

    console.log('Generating 5,000 sales...');
    for (let i = 1; i <= 5000; i++) {
        sql += `INSERT INTO sales (id, reference, total_amount, final_amount, cashier_id) VALUES (${i + 10000}, 'PERF_SALE_${i}', 50.00, 50.00, 99999);\n`;
        // add one sale item per sale
        sql += `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (${i + 10000}, ${10000 + (i % 10000) + 1}, 1, 50.00);\n`;
    }

    console.log('Generating 20,000 stock movements...');
    for (let i = 1; i <= 20000; i++) {
        sql += `INSERT INTO stock_movements (product_id, movement_type, quantity, user_id) VALUES (${10000 + (i % 10000) + 1}, 'IN', 1, 99999);\n`;
    }

    fs.writeFileSync(SEED_FILE, sql);
    console.log(`Seed script written to ${SEED_FILE}`);
}

generateSeed();
