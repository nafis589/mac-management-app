import pool from './config/database.js';

async function migrate() {
  const connection = await pool.getConnection();
  try {
    await connection.query("ALTER TABLE products ADD status ENUM('ACTIVE','ARCHIVED') DEFAULT 'ACTIVE'");
    console.log("Migration successful");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'status' already exists.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
