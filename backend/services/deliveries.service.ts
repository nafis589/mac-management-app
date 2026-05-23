import pool from '../config/database.js';
import logger from '../utils/logger.js';
import { salesService } from './sales.service.js';

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

  /**
   * Crée une livraison SANS créer de vente.
   * Le stock est réservé immédiatement (déduit de products.quantity)
   * mais aucune vente n'est enregistrée dans la table sales.
   * La vente sera créée automatiquement quand status=DELIVERED ET payment_status=PAID.
   *
   * @param deliveryData - Info client et livraison
   * @param cartItems - Articles du panier [{productId, quantity, unitPrice}]
   * @param saleData - Données de vente en attente {total_amount, discount_type, discount_value, final_amount, payment_methods, cashier_id}
   * @param amountPaid - Montant déjà payé
   * @param userId - ID de l'utilisateur qui crée la livraison
   */
  async create(deliveryData: any, cartItems: any[], saleData: any, amountPaid: number, userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const reference = await this.generateReference();
      const totalAmount = saleData.final_amount;

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

      // 1. Vérifier et réserver le stock pour chaque article
      for (const item of cartItems) {
        const productId = item.productId || item.product_id;
        const [productRows]: any = await connection.query(
          'SELECT quantity, name FROM products WHERE id = ? AND status = \'ACTIVE\'',
          [productId]
        );

        if (productRows.length === 0) {
          throw new Error(`Produit ${productId} introuvable`);
        }
        if (productRows[0].quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour "${productRows[0].name}" (disponible: ${productRows[0].quantity}, demandé: ${item.quantity})`);
        }

        // Déduire le stock (réservation)
        await connection.query(
          'UPDATE products SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, productId]
        );

        // Créer un mouvement de stock OUT avec description
        await connection.query(
          `INSERT INTO stock_movements (product_id, movement_type, quantity, user_id, description) VALUES (?, 'OUT', ?, ?, ?)`,
          [productId, item.quantity, userId, `Réservation livraison: ${reference}`]
        );
      }

      // 2. Stocker les données de vente en attente (panier + données vente)
      const pendingSaleData = JSON.stringify({
        items: cartItems,
        saleData: saleData
      });

      // 3. Insérer la livraison SANS sale_id
      const [result]: any = await connection.query(
        `INSERT INTO deliveries (
          reference, sale_id, customer_name, customer_phone, delivery_address, 
          delivery_date, delivery_time, total_amount, amount_paid, payment_status, 
          notes, pending_sale_data, created_by
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reference, customer_name, customer_phone, delivery_address,
          delivery_date, delivery_time, totalAmount, amountPaid, paymentStatus,
          notes || null, pendingSaleData, userId
        ]
      );

      const deliveryId = result.insertId;

      await connection.query(
        `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
        [userId, 'CREATE_DELIVERY', JSON.stringify({ deliveryId, reference, itemCount: cartItems.length })]
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

  /**
   * Vérifie si la livraison remplit les conditions pour finaliser la vente :
   * status = 'DELIVERED' ET payment_status = 'PAID' ET sale_id IS NULL
   * Si oui, crée la vente officielle à partir de pending_sale_data.
   */
  async tryFinalizeSale(deliveryId: number | string, connection: any): Promise<void> {
    const [rows]: any = await connection.query(
      `SELECT * FROM deliveries WHERE id = ?`,
      [deliveryId]
    );
    if (rows.length === 0) return;
    const delivery = rows[0];

    // Conditions de finalisation
    if (delivery.status !== 'DELIVERED' || delivery.payment_status !== 'PAID') {
      return; // Pas encore prêt
    }
    if (delivery.sale_id !== null && delivery.sale_id !== undefined && delivery.sale_id !== 0) {
      return; // Vente déjà créée
    }
    if (!delivery.pending_sale_data) {
      logger.warn(`Livraison ${deliveryId} prête à finaliser mais pending_sale_data manquant`);
      return;
    }

    // Récupérer les données en attente
    const pendingData = JSON.parse(delivery.pending_sale_data);
    const { items, saleData } = pendingData;

    // Créer la vente officielle (sans toucher au stock, déjà réservé)
    const saleResult = await salesService.createSaleFromDelivery(saleData, items, connection);

    // Mettre à jour la livraison avec le sale_id
    await connection.query(
      `UPDATE deliveries SET sale_id = ?, pending_sale_data = NULL WHERE id = ?`,
      [saleResult.saleId, deliveryId]
    );

    // Mettre à jour la vente avec la référence de livraison
    await connection.query(
      `UPDATE sales SET delivery_required = 1, delivery_id = ? WHERE id = ?`,
      [deliveryId, saleResult.saleId]
    );

    await connection.query(
      `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
      [delivery.created_by, 'DELIVERY_SALE_FINALIZED', JSON.stringify({
        deliveryId,
        saleId: saleResult.saleId,
        saleReference: saleResult.reference
      })]
    );

    logger.info(`Livraison ${deliveryId} finalisée → Vente ${saleResult.reference} créée`);
  },

  async getAll(filters: any = {}) {
    try {
      const { page = 1, limit = 50, search, status, payment_status, date_start, date_end } = filters;
      const offset = (page - 1) * limit;

      let query = `
        SELECT d.*
        FROM deliveries d
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

      const countQuery = query.replace('SELECT d.*', 'SELECT COUNT(*) as total');
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
          u_creator.first_name as creator_first_name, u_creator.last_name as creator_last_name,
          u_deliverer.first_name as deliverer_first_name, u_deliverer.last_name as deliverer_last_name
        FROM deliveries d
        LEFT JOIN users u_creator ON d.created_by = u_creator.id
        LEFT JOIN users u_deliverer ON d.delivered_by = u_deliverer.id
        WHERE d.id = ?
      `;
      const [rows]: any = await pool.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Delivery not found');
      }

      const delivery = rows[0];

      // Si la vente est finalisée, récupérer les articles depuis sale_items
      if (delivery.sale_id) {
        const [saleItems]: any = await pool.query(`
          SELECT si.*, p.name as product_name, p.reference as product_reference
          FROM sale_items si
          JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?
        `, [delivery.sale_id]);
        delivery.items = saleItems;

        // Récupérer la référence de vente
        const [saleRows]: any = await pool.query(`SELECT reference FROM sales WHERE id = ?`, [delivery.sale_id]);
        if (saleRows.length > 0) {
          delivery.sale_reference = saleRows[0].reference;
        }
      } else if (delivery.pending_sale_data) {
        // Sinon, récupérer les articles depuis pending_sale_data
        const pendingData = JSON.parse(delivery.pending_sale_data);
        const items = pendingData.items || [];
        // Enrichir avec les noms de produits
        const enrichedItems = [];
        for (const item of items) {
          const productId = item.productId || item.product_id;
          const [productRows]: any = await pool.query(
            `SELECT name, reference FROM products WHERE id = ?`,
            [productId]
          );
          enrichedItems.push({
            product_id: productId,
            quantity: item.quantity,
            unit_price: item.unitPrice || item.unit_price,
            product_name: productRows.length > 0 ? productRows[0].name : 'Produit inconnu',
            product_reference: productRows.length > 0 ? productRows[0].reference : ''
          });
        }
        delivery.items = enrichedItems;
        delivery.sale_reference = null;
      } else {
        delivery.items = [];
        delivery.sale_reference = null;
      }

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

      const [rows]: any = await connection.query(`SELECT total_amount, amount_paid, status FROM deliveries WHERE id = ?`, [id]);
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

      // Tenter de finaliser la vente si toutes les conditions sont remplies
      await this.tryFinalizeSale(id, connection);

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

      // Tenter de finaliser la vente si toutes les conditions sont remplies
      await this.tryFinalizeSale(id, connection);

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

  /**
   * Annule une livraison.
   * Si la vente n'a pas encore été créée (sale_id IS NULL), restaure le stock réservé.
   * Si la vente a été créée (sale_id exists), annule aussi la vente via salesService.cancelSale.
   */
  async cancel(id: number | string, reason: string, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows]: any = await connection.query(`SELECT * FROM deliveries WHERE id = ?`, [id]);
      if (rows.length === 0) throw new Error('Delivery not found');
      const delivery = rows[0];

      if (delivery.status === 'CANCELLED') {
        throw new Error('Cette livraison est déjà annulée');
      }

      // Mettre à jour le statut de la livraison
      await connection.query(
        `UPDATE deliveries SET status = 'CANCELLED' WHERE id = ?`,
        [id]
      );

      if (delivery.sale_id) {
        // La vente a été finalisée → annuler la vente (qui restaure le stock)
        // On commit d'abord la transaction courante puis on délègue
        await connection.query(
          `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
          [userId, 'CANCEL_DELIVERY', JSON.stringify({ deliveryId: id, reason, hadSale: true, saleId: delivery.sale_id })]
        );
        await connection.commit();
        connection.release();

        // Annuler la vente séparément (elle gère sa propre transaction)
        await salesService.cancelSale(delivery.sale_id, `Annulation livraison ${delivery.reference}: ${reason}`, userId);
        return true;
      } else {
        // Pas encore de vente → restaurer le stock réservé manuellement
        if (delivery.pending_sale_data) {
          const pendingData = JSON.parse(delivery.pending_sale_data);
          const items = pendingData.items || [];

          for (const item of items) {
            const productId = item.productId || item.product_id;

            // Restaurer le stock
            await connection.query(
              'UPDATE products SET quantity = quantity + ? WHERE id = ?',
              [item.quantity, productId]
            );

            // Créer un mouvement de stock IN (annulation)
            await connection.query(
              `INSERT INTO stock_movements (product_id, movement_type, quantity, user_id, description) VALUES (?, 'IN', ?, ?, ?)`,
              [productId, item.quantity, userId, `Annulation livraison: ${delivery.reference}`]
            );
          }
        }

        await connection.query(
          `INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)`,
          [userId, 'CANCEL_DELIVERY', JSON.stringify({ deliveryId: id, reason, hadSale: false })]
        );

        await connection.commit();
        return true;
      }
    } catch (error) {
      try { await connection.rollback(); } catch (e) { /* connection may have been released */ }
      logger.error('deliveriesService.cancel error:', error);
      throw error;
    } finally {
      try { connection.release(); } catch (e) { /* may already be released */ }
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
        WHERE payment_status != 'PAID' AND status != 'CANCELLED'
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
