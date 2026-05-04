import pool from './config/database.js';

async function migrate() {
  const connection = await pool.getConnection();

  try {
    await connection.query("ALTER TABLE products ADD COLUMN status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE'");
    console.log("Added status column");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column 'status' already exists.");
    else console.error("status error:", e.message);
  }

  try {
    await connection.query("ALTER TABLE products ADD COLUMN archived_at TIMESTAMP NULL");
    console.log("Added archived_at column");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column 'archived_at' already exists.");
    else console.error("archived_at error:", e.message);
  }

  try {
    await connection.query("ALTER TABLE products ADD COLUMN archived_by INT NULL");
    console.log("Added archived_by column");
  } catch (e: any) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column 'archived_by' already exists.");
    else console.error("archived_by error:", e.message);
  }

  try {
    await connection.query("ALTER TABLE products ADD CONSTRAINT fk_product_archived_by FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL");
    console.log("Added foreign key fk_product_archived_by");
  } catch (e: any) {
    console.log("FK constraint:", e.message?.includes("Duplicate") ? "already exists" : e.message);
  }

  connection.release();
  process.exit(0);
}

migrate();
