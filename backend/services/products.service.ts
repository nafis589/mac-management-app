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
        WHERE 1=1
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
        WHERE p.id = ?
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
        WHERE name LIKE ? OR reference LIKE ? OR description LIKE ?
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

      // Soft delete usually implies setting a status or deleted_at flag. 
      // However the schema doesn't describe one. So I will log the action and hard delete.
      
      // Get product details for logs
      const [productRows]: any = await connection.query('SELECT * FROM products WHERE id = ?', [id]);
      const product = productRows[0] || null;

      await connection.query('DELETE FROM products WHERE id = ?', [id]);

      if (userId && product) {
        // According to project.md -> logs: user_id, action, details, created_at
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
