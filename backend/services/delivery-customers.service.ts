import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const deliveryCustomersService = {
  async search(query: string) {
    try {
      const likeQuery = `%${query}%`;
      const [rows]: any = await pool.query(
        `SELECT * FROM delivery_customers 
         WHERE name LIKE ? OR phone LIKE ? 
         LIMIT 5`,
        [likeQuery, likeQuery]
      );
      return rows;
    } catch (error) {
      logger.error('deliveryCustomersService.search error:', error);
      throw error;
    }
  },

  async findOrCreate(name: string, phone: string, address: string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows]: any = await connection.query(
        `SELECT * FROM delivery_customers WHERE phone = ?`,
        [phone]
      );

      if (rows.length > 0) {
        const customer = rows[0];
        await connection.query(
          `UPDATE delivery_customers SET name = ?, address = ? WHERE id = ?`,
          [name, address, customer.id]
        );
        await connection.commit();
        return { ...customer, name, address };
      } else {
        const [result]: any = await connection.query(
          `INSERT INTO delivery_customers (name, phone, address) VALUES (?, ?, ?)`,
          [name, phone, address]
        );
        const newCustomerId = result.insertId;
        await connection.commit();
        
        const [newCustomerRows]: any = await pool.query(
          `SELECT * FROM delivery_customers WHERE id = ?`,
          [newCustomerId]
        );
        return newCustomerRows[0];
      }
    } catch (error) {
      await connection.rollback();
      logger.error('deliveryCustomersService.findOrCreate error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getAll() {
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(d.id) as deliveries_count,
          SUM(CASE WHEN d.status != 'CANCELLED' THEN (d.total_amount - d.amount_paid) ELSE 0 END) as amount_due,
          MAX(d.delivery_date) as last_delivery_date,
          SUM(CASE WHEN d.status IN ('PENDING', 'IN_PROGRESS') THEN 1 ELSE 0 END) as pending_deliveries_count
        FROM delivery_customers c
        LEFT JOIN deliveries d ON c.id = d.customer_id
        GROUP BY c.id
      `;
      const [rows]: any = await pool.query(query);
      return rows;
    } catch (error) {
      logger.error('deliveryCustomersService.getAll error:', error);
      throw error;
    }
  },

  async getById(id: number | string) {
    try {
      const query = `
        SELECT 
          c.*,
          COUNT(d.id) as deliveries_count,
          SUM(CASE WHEN d.status != 'CANCELLED' THEN (d.total_amount - d.amount_paid) ELSE 0 END) as amount_due,
          MAX(d.delivery_date) as last_delivery_date,
          SUM(CASE WHEN d.status IN ('PENDING', 'IN_PROGRESS') THEN 1 ELSE 0 END) as pending_deliveries_count
        FROM delivery_customers c
        LEFT JOIN deliveries d ON c.id = d.customer_id
        WHERE c.id = ?
        GROUP BY c.id
      `;
      const [rows]: any = await pool.query(query, [id]);
      if (rows.length === 0) {
        throw new Error('Customer not found');
      }
      return rows[0];
    } catch (error) {
      logger.error('deliveryCustomersService.getById error:', error);
      throw error;
    }
  }
};
