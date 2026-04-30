import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const stockService = {
  async getDashboard() {
    try {
      const query = `
        SELECT 
          COUNT(*) as totalProducts, 
          COALESCE(SUM(purchase_price * quantity), 0) as stockValue,
          SUM(CASE WHEN quantity < min_stock THEN 1 ELSE 0 END) as lowStockCount
        FROM products
      `;
      const [rows]: any = await pool.query(query);
      return rows[0];
    } catch (error) {
      logger.error('stockService.getDashboard error:', error);
      throw error;
    }
  },

  async getLowStockAlerts() {
    try {
      const query = `
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.quantity < p.min_stock
        ORDER BY p.quantity ASC
      `;
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      logger.error('stockService.getLowStockAlerts error:', error);
      throw error;
    }
  },

  async getMovements(filters: any = {}) {
    try {
      let query = `
        SELECT sm.*, p.name as product_name, p.reference as product_reference, u.username as user_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.date_start) {
        query += ' AND sm.created_at >= ?';
        params.push(filters.date_start);
      }
      if (filters.date_end) {
        query += ' AND sm.created_at <= ?';
        params.push(filters.date_end);
      }
      if (filters.type) {
        query += ' AND sm.type = ?';
        params.push(filters.type);
      }
      if (filters.product_id) {
        query += ' AND sm.product_id = ?';
        params.push(filters.product_id);
      }

      query += ' ORDER BY sm.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(Number(filters.limit));
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(Number(filters.offset));
        }
      }

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      logger.error('stockService.getMovements error:', error);
      throw error;
    }
  },

  async getAll(filters: any = {}) {
    return this.getMovements(filters);
  },

  async getById(id: number | string) {
    try {
      const query = `
        SELECT sm.*, p.name as product_name, p.reference as product_reference, u.username as user_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE sm.id = ?
      `;
      const [rows]: any = await pool.query(query, [id]);
      if (rows.length === 0) throw new Error('Stock movement not found');
      return rows[0];
    } catch (error) {
      logger.error('stockService.getById error:', error);
      throw error;
    }
  },

  async addStock(productId: number | string, quantity: number, userId: number | string, type: string = 'IN') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const qtyChange = type === 'IN' ? quantity : -quantity;

      if (type === 'OUT') {
        const [product]: any = await connection.query('SELECT quantity FROM products WHERE id = ?', [productId]);
        if (!product || product.length === 0) throw new Error('Product not found');
        if (product[0].quantity < quantity) throw new Error('Stock insuffisant');
      }

      await connection.query(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [qtyChange, productId]
      );

      const [result]: any = await connection.query(
        'INSERT INTO stock_movements (product_id, type, quantity, user_id) VALUES (?, ?, ?, ?)',
        [productId, type, quantity, userId]
      );

      const [updatedProduct]: any = await connection.query('SELECT quantity FROM products WHERE id = ?', [productId]);
      
      await connection.commit();
      return { id: result.insertId, newQuantity: updatedProduct[0].quantity };
    } catch (error) {
      await connection.rollback();
      logger.error('stockService.addStock error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async create(data: any) {
    const { product_id, quantity, user_id, type = 'IN' } = data;
    return this.addStock(product_id, quantity, user_id, type);
  },

  async update(id: number | string, data: any) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [movementRows]: any = await connection.query('SELECT * FROM stock_movements WHERE id = ?', [id]);
      if (movementRows.length === 0) throw new Error('Stock movement not found');
      const oldMovement = movementRows[0];

      // Revert old movement
      const oldQtyChange = oldMovement.type === 'IN' ? -oldMovement.quantity : oldMovement.quantity;
      await connection.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [oldQtyChange, oldMovement.product_id]);

      // Apply new movement
      const newType = data.type || oldMovement.type;
      const newQuantity = data.quantity !== undefined ? data.quantity : oldMovement.quantity;
      const newProductId = data.product_id || oldMovement.product_id;
      
      if (newType === 'OUT') {
        const [product]: any = await connection.query('SELECT quantity FROM products WHERE id = ?', [newProductId]);
        if (!product || product.length === 0) throw new Error('Product not found');
        if (product[0].quantity < newQuantity) throw new Error('Stock insuffisant for new update');
      }

      const newQtyChange = newType === 'IN' ? newQuantity : -newQuantity;
      await connection.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [newQtyChange, newProductId]);

      // Update movement
      const allowedFields = ['product_id', 'type', 'quantity'];
      const updates: string[] = [];
      const params: any[] = [];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`\`${field}\` = ?`);
          params.push(data[field]);
        }
      }

      if (updates.length > 0) {
        params.push(id);
        await connection.query(`UPDATE stock_movements SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('stockService.update error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async delete(id: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [movementRows]: any = await connection.query('SELECT * FROM stock_movements WHERE id = ?', [id]);
      if (movementRows.length === 0) throw new Error('Stock movement not found');
      const oldMovement = movementRows[0];

      // Revert old movement
      const oldQtyChange = oldMovement.type === 'IN' ? -oldMovement.quantity : oldMovement.quantity;
      await connection.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [oldQtyChange, oldMovement.product_id]);

      await connection.query('DELETE FROM stock_movements WHERE id = ?', [id]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('stockService.delete error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};
