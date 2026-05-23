import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const deliveriesService = {
  async generateReference(): Promise<string> {
    const connection = await pool.getConnection();
    try {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `LIV-${date}`;
      const [rows]: any = await connection.query(
        `SELECT COUNT(*) as count FROM deliveries WHERE reference LIKE ?`,
        [`${prefix}-%`]
      );
      const count = rows[0].count + 1;
      return `${prefix}-${String(count).padStart(3, '0')}`;
    } finally {
      connection.release();
    }
  },

  async create(deliveryData: any, saleId: number, totalAmount: number, amountPaid: number, userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const reference = await this.generateReference();
      
      let paymentStatus = 'UNPAID';
      if (amountPaid > 0) {
        if (amountPaid >= totalAmount) {
          paymentStatus = 'PAID';
        } else {
          paymentStatus = 'PARTIAL';
        }
      }

      const {
        customer_name, customer_phone, delivery_address, delivery_date, delivery_time, notes
      } = deliveryData;

      const [result]: any = await connection.query(
        `INSERT INTO deliveries (
          reference, sale_id, customer_name, customer_phone, delivery_address, 
          delivery_date, delivery_time, total_amount, amount_paid, payment_status, 
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reference, saleId, customer_name, customer_phone, delivery_address,
          delivery_date, delivery_time, totalAmount, amountPaid, paymentStatus,
          notes || null, userId
        ]
      );

      const deliveryId = result.insertId;

      await connection.query(
        `UPDATE sales SET delivery_required = 1, delivery_id = ? WHERE id = ?`,
        [deliveryId, saleId]
      );

      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, 'CREATE_DELIVERY', JSON.stringify({ deliveryId, reference, saleId })]
      );

      await connection.commit();
      
      return await this.getById(deliveryId);
    } catch (error) {
      await connection.rollback();
      logger.error('deliveriesService.create error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getAll(filters: any = {}) {
    try {
      const { page = 1, limit = 50, search, status, payment_status, date_start, date_end } = filters;
      const offset = (page - 1) * limit;

      let query = `
        SELECT d.*, s.final_amount as sale_final_amount
        FROM deliveries d
        JOIN sales s ON d.sale_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status && status !== 'ALL') {
        query += ` AND d.status = ?`;
        params.push(status);
      }

      if (payment_status && payment_status !== 'ALL') {
        query += ` AND d.payment_status = ?`;
        params.push(payment_status);
      }

      if (date_start) {
        query += ` AND d.delivery_date >= ?`;
        params.push(date_start);
      }

      if (date_end) {
        query += ` AND d.delivery_date <= ?`;
        params.push(date_end);
      }

      if (search) {
        query += ` AND (d.reference LIKE ? OR d.customer_name LIKE ? OR d.customer_phone LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like);
      }

      const countQuery = query.replace('SELECT d.*, s.final_amount as sale_final_amount', 'SELECT COUNT(*) as total');
      const [countResult]: any = await pool.query(countQuery, params);
      const total = countResult[0].total;

      query += ` ORDER BY d.delivery_date ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [deliveries] = await pool.query(query, params);

      return {
        deliveries,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('deliveriesService.getAll error:', error);
      throw error;
    }
  },

  async getById(id: number | string) {
    try {
      const query = `
        SELECT 
          d.*,
          s.reference as sale_reference, s.final_amount as sale_final_amount,
          u_creator.first_name as creator_first_name, u_creator.last_name as creator_last_name,
          u_deliverer.first_name as deliverer_first_name, u_deliverer.last_name as deliverer_last_name
        FROM deliveries d
        JOIN sales s ON d.sale_id = s.id
        LEFT JOIN users u_creator ON d.created_by = u_creator.id
        LEFT JOIN users u_deliverer ON d.delivered_by = u_deliverer.id
        WHERE d.id = ?
      `;
      const [rows]: any = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error('Delivery not found');
      }
      
      const delivery = rows[0];

      const [saleItems]: any = await pool.query(`
        SELECT si.*, p.name as product_name, p.reference as product_reference
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `, [delivery.sale_id]);
      
      delivery.items = saleItems;

      return delivery;
    } catch (error) {
      logger.error('deliveriesService.getById error:', error);
      throw error;
    }
  },

  async addPayment(id: number | string, amount: number, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows]: any = await connection.query(`SELECT total_amount, amount_paid FROM deliveries WHERE id = ?`, [id]);
      if (rows.length === 0) throw new Error('Delivery not found');
      
      const current = rows[0];
      const newAmountPaid = Number(current.amount_paid) + Number(amount);
      
      let paymentStatus = 'UNPAID';
      if (newAmountPaid > 0) {
        if (newAmountPaid >= Number(current.total_amount)) {
          paymentStatus = 'PAID';
        } else {
          paymentStatus = 'PARTIAL';
        }
      }

      await connection.query(
        `UPDATE deliveries SET amount_paid = ?, payment_status = ? WHERE id = ?`,
        [newAmountPaid, paymentStatus, id]
      );

      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, 'DELIVERY_PAYMENT', JSON.stringify({ deliveryId: id, amountAdded: amount, newAmountPaid, paymentStatus })]
      );

      await connection.commit();
      
      return await this.getById(id);
    } catch (error) {
      await connection.rollback();
      logger.error('deliveriesService.addPayment error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateStatus(id: number | string, status: string, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let query = `UPDATE deliveries SET status = ?`;
      const params: any[] = [status];

      if (status === 'DELIVERED') {
        query += `, delivered_at = CURRENT_TIMESTAMP, delivered_by = ?`;
        params.push(userId);
      }

      query += ` WHERE id = ?`;
      params.push(id);

      await connection.query(query, params);

      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, 'UPDATE_DELIVERY_STATUS', JSON.stringify({ deliveryId: id, newStatus: status })]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('deliveriesService.updateStatus error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async cancel(id: number | string, reason: string, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE deliveries SET status = 'CANCELLED' WHERE id = ?`,
        [id]
      );

      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, 'CANCEL_DELIVERY', JSON.stringify({ deliveryId: id, reason })]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('deliveriesService.cancel error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getStats() {
    try {
      const [statusRows]: any = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM deliveries 
        GROUP BY status
      `);

      const [paymentRows]: any = await pool.query(`
        SELECT payment_status, COUNT(*) as count 
        FROM deliveries 
        GROUP BY payment_status
      `);

      const [amountDueRows]: any = await pool.query(`
        SELECT SUM(total_amount - amount_paid) as total_amount_due 
        FROM deliveries 
        WHERE payment_status != 'PAID'
      `);

      return {
        status_counts: statusRows,
        payment_status_counts: paymentRows,
        total_amount_due: amountDueRows[0]?.total_amount_due || 0
      };
    } catch (error) {
      logger.error('deliveriesService.getStats error:', error);
      throw error;
    }
  }
};
