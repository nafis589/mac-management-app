import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const salesService = {
  async generateReference() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const query = `SELECT count(*) as count FROM sales WHERE reference LIKE ?`;
    const [rows]: any = await pool.query(query, [`VTE-${dateStr}-%`]);
    const count = rows[0].count + 1;
    return `VTE-${dateStr}-${count.toString().padStart(3, '0')}`;
  },

  async createSale(saleData: any, items: any[]) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const reference = await this.generateReference();
      
      // Insert sale
      const [saleResult]: any = await connection.query(
        `INSERT INTO sales (reference, total_amount, discount_type, discount_value, final_amount, payment_methods, cashier_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reference,
          saleData.total_amount,
          saleData.discount_type || null,
          saleData.discount_value || null,
          saleData.final_amount,
          JSON.stringify(saleData.payment_methods || []),
          saleData.cashier_id
        ]
      );
      const saleId = saleResult.insertId;

      // Process items
      for (const item of items) {
        // Check stock
        const [productRows]: any = await connection.query(
          'SELECT quantity FROM products WHERE id = ? AND status = \'ACTIVE\' FOR UPDATE',
          [item.productId || item.product_id]
        );
        
        const productId = item.productId || item.product_id;
        if (productRows.length === 0) {
          throw new Error(`Product ${productId} not found`);
        }
        if (productRows[0].quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${productId}`);
        }

        // Insert sale item
        await connection.query(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
          [saleId, productId, item.quantity, item.unitPrice || item.unit_price]
        );

        // Update product stock
        await connection.query(
          'UPDATE products SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, productId]
        );

        // Insert stock movement
        await connection.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, user_id) VALUES (?, 'OUT', ?, ?)`,
          [productId, item.quantity, saleData.cashier_id]
        );
      }

      await connection.commit();
      return { success: true, saleId, reference };
    } catch (error) {
      await connection.rollback();
      logger.error('salesService.createSale error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async cancelSale(saleId: number | string, reason: string, adminId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if already cancelled
      const [saleRows]: any = await connection.query('SELECT * FROM sales WHERE id = ? FOR UPDATE', [saleId]);
      if (saleRows.length === 0) throw new Error('Sale not found');
      const sale = saleRows[0];
      if (sale.cancelled_at) throw new Error('Sale is already cancelled');

      // Update sale
      await connection.query(
        'UPDATE sales SET cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ? WHERE id = ?',
        [reason, saleId]
      );

      // Get sale items
      const [items]: any = await connection.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

      // Restore stock and create movements
      for (const item of items) {
        await connection.query(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        await connection.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, user_id) VALUES (?, 'IN', ?, ?)`,
          [item.product_id, item.quantity, adminId]
        );
      }

      // Insert log
      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, 'SALE_CANCELLED', ?)`,
        [adminId, JSON.stringify({ saleId, reason })]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      logger.error('salesService.cancelSale error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getHistory(filters: any = {}) {
    try {
      let query = `
        SELECT s.*, u.username as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.date_start) {
        query += ' AND s.created_at >= ?';
        params.push(filters.date_start);
      }
      if (filters.date_end) {
        query += ' AND s.created_at <= ?';
        params.push(filters.date_end);
      }
      if (filters.cashier_id) {
        query += ' AND s.cashier_id = ?';
        params.push(filters.cashier_id);
      }
      if (filters.min_amount) {
        query += ' AND s.final_amount >= ?';
        params.push(filters.min_amount);
      }
      if (filters.max_amount) {
        query += ' AND s.final_amount <= ?';
        params.push(filters.max_amount);
      }

      query += ' ORDER BY s.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(Number(filters.limit));
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(Number(filters.offset));
        }
      }

      const [rows]: any = await pool.query(query, params);

      // If requested, include items for each sale
      if (filters.include_items === 'true' || filters.include_items === true) {
        for (const row of rows) {
          const [items]: any = await pool.query(
            `SELECT si.*, p.name as product_name, p.reference as product_reference
             FROM sale_items si
             LEFT JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [row.id]
          );
          row.items = items;
        }
      }

      return rows;
    } catch (error) {
      logger.error('salesService.getHistory error:', error);
      throw error;
    }
  },

  async getAll(filters: any = {}) {
    return this.getHistory(filters);
  },

  async getSaleById(id: number | string) {
    try {
      const [sales]: any = await pool.query(
        `SELECT s.*, u.username as cashier_name
         FROM sales s
         LEFT JOIN users u ON s.cashier_id = u.id
         WHERE s.id = ?`,
        [id]
      );
      if (sales.length === 0) throw new Error('Sale not found');
      const sale = sales[0];

      const [items]: any = await pool.query(
        `SELECT si.*, p.name as product_name, p.reference as product_reference
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [id]
      );
      sale.items = items;

      return sale;
    } catch (error) {
      logger.error('salesService.getSaleById error:', error);
      throw error;
    }
  },

  async getById(id: number | string) {
    return this.getSaleById(id);
  },

  async create(data: any) {
    const { items, ...saleData } = data;
    return this.createSale(saleData, items);
  },

  async update(id: number | string, data: any) {
    throw new Error('Les ventes ne peuvent pas être modifiées directement, utilisez cancelSale');
  },

  async delete(id: number | string) {
    throw new Error('Les ventes ne peuvent pas être supprimées physiquement, utilisez cancelSale');
  },

  /**
   * Crée une vente officielle à partir d'une livraison finalisée.
   * IMPORTANT : Cette méthode NE touche PAS au stock ni aux stock_movements,
   * car le stock a déjà été réservé lors de la création de la livraison.
   * 
   * @param saleData - Données de la vente (total_amount, discount_type, discount_value, final_amount, payment_methods, cashier_id)
   * @param items - Articles [{productId, quantity, unitPrice}]
   * @param connection - Connexion de transaction existante (fournie par deliveriesService.tryFinalizeSale)
   */
  async createSaleFromDelivery(saleData: any, items: any[], connection: any) {
    const reference = await this.generateReference();

    // Insert sale
    const [saleResult]: any = await connection.query(
      `INSERT INTO sales (reference, total_amount, discount_type, discount_value, final_amount, payment_methods, cashier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        saleData.total_amount,
        saleData.discount_type || null,
        saleData.discount_value || null,
        saleData.final_amount,
        typeof saleData.payment_methods === 'string' ? saleData.payment_methods : JSON.stringify(saleData.payment_methods || []),
        saleData.cashier_id
      ]
    );
    const saleId = saleResult.insertId;

    // Insert sale items (sans toucher au stock)
    for (const item of items) {
      const productId = item.productId || item.product_id;
      await connection.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        [saleId, productId, item.quantity, item.unitPrice || item.unit_price]
      );
    }

    logger.info(`Vente ${reference} créée depuis livraison (sans mouvement de stock, déjà réservé)`);
    return { success: true, saleId, reference };
  }
};
