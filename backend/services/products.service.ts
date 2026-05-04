import pool from '../config/database.js';
import logger from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const productsService = {
  async generateReference(): Promise<string> {
    const connection = await pool.getConnection();
    try {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `${CONSTANTS.PRODUCT_REFERENCE_PREFIX}-${date}`;
      const [rows]: any = await connection.query(
        `SELECT COUNT(*) as count FROM products WHERE reference LIKE ?`,
        [`${prefix}-%`]
      );
      const count = rows[0].count + 1;
      return `${prefix}-${String(count).padStart(3, '0')}`;
    } finally {
      connection.release();
    }
  },

  async create(productData: any) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const reference = await this.generateReference();
      const {
        name, category_id, brand_id, size, color, condition,
        purchase_price, sale_price, quantity, min_stock, description
      } = productData;

      const [result]: any = await connection.query(
        `INSERT INTO products (
          reference, name, category_id, brand_id, size, color,
          \`condition\`, purchase_price, sale_price, quantity, min_stock, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reference, name, category_id, brand_id, size, color,
          condition, purchase_price, sale_price, quantity, min_stock, description
        ]
      );

      if (quantity > 0) {
        await connection.query(
          'INSERT INTO stock_movements (product_id, movement_type, quantity, user_id) VALUES (?, ?, ?, ?)',
          [result.insertId, 'IN', quantity, productData.user_id || null]
        );
      }

      await connection.commit();
      return { id: result.insertId, reference };
    } catch (error) {
      await connection.rollback();
      logger.error('productsService.create error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getAll(filters: any = {}) {
    try {
      // JOIN avec categories et brands pour renvoyer les noms (utilisés dans la liste frontend)
      let query = `
        SELECT
          p.*,
          c.name AS category_name,
          b.name AS brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands   b ON p.brand_id   = b.id
        WHERE p.status = 'ACTIVE'
      `;
      const params: any[] = [];

      // Filtre recherche rapide
      if (filters.search) {
        query += ' AND (p.name LIKE ? OR p.reference LIKE ? OR p.description LIKE ?)';
        const like = `%${filters.search}%`;
        params.push(like, like, like);
      }

      // Filtres optionnels catégorie / marque
      if (filters.category_id) {
        query += ' AND p.category_id = ?';
        params.push(filters.category_id);
      }
      if (filters.brand_id) {
        query += ' AND p.brand_id = ?';
        params.push(filters.brand_id);
      }

      query += ' ORDER BY p.created_at DESC';

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      logger.error('productsService.getAll error:', error);
      throw error;
    }
  },

  async getById(id: number | string) {
    try {
      // According to PROJECT.md "SELECT avec JOIN" for getById
      // I will join with categories and brands (if they exist)
      const query = `
        SELECT p.*, c.name as category_name, b.name as brand_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = ? AND p.status = 'ACTIVE'
      `;
      const [rows]: any = await pool.query(query, [id]);
      if (rows.length === 0) throw new Error('Product not found');
      return rows[0];
    } catch (error) {
      logger.error('productsService.getById error:', error);
      throw error;
    }
  },

  async search(term: string) {
    try {
      const sql = `
        SELECT * FROM products 
        WHERE (name LIKE ? OR reference LIKE ? OR description LIKE ?) AND status = 'ACTIVE'
      `;
      const likeTerm = `%${term}%`;
      const [rows] = await pool.query(sql, [likeTerm, likeTerm, likeTerm]);
      return rows;
    } catch (error) {
      logger.error('productsService.search error:', error);
      throw error;
    }
  },

  async update(id: number | string, productData: any) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const allowedFields = [
        'name', 'category_id', 'brand_id', 'size', 'color',
        'condition', 'purchase_price', 'sale_price', 'quantity',
        'min_stock', 'description', 'photos'
      ];
      const updates: string[] = [];
      const params: any[] = [];

      let oldQuantity = 0;
      if (productData.quantity !== undefined) {
        const [rows]: any = await connection.query('SELECT quantity FROM products WHERE id = ?', [id]);
        if (rows.length > 0) {
          oldQuantity = Number(rows[0].quantity) || 0;
        }
      }

      for (const field of allowedFields) {
        if (productData[field] !== undefined) {
          updates.push(`\`${field}\` = ?`);
          let value = productData[field];
          if (field === 'photos' && typeof value !== 'string') { // ensure stringified JSON
             value = JSON.stringify(value);
          }
          params.push(value);
        }
      }

      if (updates.length === 0) {
        await connection.commit();
        return true;
      }

      params.push(id);
      
      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      await connection.query(sql, params);

      if (productData.quantity !== undefined) {
        const newQuantity = Number(productData.quantity);
        const diff = newQuantity - oldQuantity;
        if (diff !== 0) {
          const type = diff > 0 ? 'IN' : 'OUT';
          await connection.query(
            'INSERT INTO stock_movements (product_id, movement_type, quantity, user_id) VALUES (?, ?, ?, ?)',
            [id, type, Math.abs(diff), productData.user_id || null]
          );
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('productsService.update error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async delete(id: number | string, userId?: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Soft delete -> always archive the product
      const [productRows]: any = await connection.query('SELECT * FROM products WHERE id = ?', [id]);
      const product = productRows[0] || null;

      if (!product) {
        throw new Error('Product not found');
      }

      await connection.query(
        'UPDATE products SET status = ?, archived_at = NOW(), archived_by = ? WHERE id = ?',
        ['ARCHIVED', userId || null, id]
      );
      
      if (userId) {
        await connection.query(
          'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
          [userId, 'DELETE_PRODUCT', JSON.stringify({ productId: id, reference: product.reference })]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error('productsService.delete error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getDeleted() {
    try {
      const listQuery = `
        SELECT 
          p.id, p.name, p.reference, p.photos, p.sale_price, p.purchase_price, p.quantity,
          c.name AS category, b.name AS brand,
          p.archived_at, p.archived_by,
          u.first_name AS archived_by_first_name, u.last_name AS archived_by_last_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN users u ON p.archived_by = u.id
        WHERE p.status = 'ARCHIVED'
        ORDER BY p.archived_at DESC
      `;
      const [products] = await pool.query(listQuery);

      const globalStatsQuery = `
        SELECT 
          COUNT(*) as total_archived,
          SUM(quantity) as lost_quantity,
          SUM(purchase_price * quantity) as lost_stock_value,
          SUM(sale_price * quantity) as lost_potential_revenue
        FROM products
        WHERE status = 'ARCHIVED'
      `;
      const [globalStats]: any = await pool.query(globalStatsQuery);

      const dailyStatsQuery = `
        SELECT 
          DATE(archived_at) as date,
          COUNT(*) as count,
          SUM(purchase_price * quantity) as lost_value
        FROM products
        WHERE status = 'ARCHIVED' AND archived_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(archived_at)
        ORDER BY date DESC
      `;
      const [dailyStats] = await pool.query(dailyStatsQuery);

      const monthlyStatsQuery = `
        SELECT 
          DATE_FORMAT(archived_at, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(purchase_price * quantity) as lost_value
        FROM products
        WHERE status = 'ARCHIVED' AND archived_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(archived_at, '%Y-%m')
        ORDER BY month DESC
      `;
      const [monthlyStats] = await pool.query(monthlyStatsQuery);

      const categoryStatsQuery = `
        SELECT 
          c.name as category,
          COUNT(p.id) as count,
          SUM(p.purchase_price * p.quantity) as lost_value
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'ARCHIVED'
        GROUP BY p.category_id, c.name
        ORDER BY lost_value DESC
      `;
      const [categoryStats] = await pool.query(categoryStatsQuery);

      const brandStatsQuery = `
        SELECT 
          b.name as brand,
          COUNT(p.id) as count,
          SUM(p.purchase_price * p.quantity) as lost_value
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.status = 'ARCHIVED'
        GROUP BY p.brand_id, b.name
        ORDER BY lost_value DESC
      `;
      const [brandStats] = await pool.query(brandStatsQuery);

      return {
        products,
        global_stats: {
          total_archived: globalStats[0]?.total_archived || 0,
          lost_quantity: globalStats[0]?.lost_quantity || 0,
          lost_stock_value: globalStats[0]?.lost_stock_value || 0,
          lost_potential_revenue: globalStats[0]?.lost_potential_revenue || 0
        },
        daily_stats: dailyStats,
        monthly_stats: monthlyStats,
        grouped_by_category: categoryStats,
        grouped_by_brand: brandStats
      };
    } catch (error) {
      logger.error('productsService.getDeleted error:', error);
      throw error;
    }
  },

  async uploadPhotos(productId: number | string, files: any[]) {
    try {
      // Assuming upload is in project root /uploads/products -> relative to this file would be ../../uploads/products/
      const uploadDir = path.join(__dirname, '../../uploads/products', String(productId));
      fs.mkdirSync(uploadDir, { recursive: true });
      
      const photoPaths = [];
      
      for (const file of files) {
        // file structure from multer memoryStorage: { buffer: Buffer, originalname: string, mimetype: string }
        const ext = file.originalname ? path.extname(file.originalname) : '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const filepath = path.join(uploadDir, filename);
        
        fs.writeFileSync(filepath, file.buffer);
        
        photoPaths.push(`/uploads/products/${productId}/${filename}`);
      }
      
      // retrieve existing photos
      const [rows]: any = await pool.query('SELECT photos FROM products WHERE id = ?', [productId]);
      let currentPhotos = [];
      if (rows.length > 0 && rows[0].photos) {
          try {
              currentPhotos = typeof rows[0].photos === 'string' ? JSON.parse(rows[0].photos) : rows[0].photos;
          } catch(e) {}
      }
      const updatedPhotos = [...currentPhotos, ...photoPaths];

      await pool.query(
        'UPDATE products SET photos = ? WHERE id = ?',
        [JSON.stringify(updatedPhotos), productId]
      );
      
      return updatedPhotos;
    } catch (error) {
      logger.error('productsService.uploadPhotos error:', error);
      throw error;
    }
  }
};
