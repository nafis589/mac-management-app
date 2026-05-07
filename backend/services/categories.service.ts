import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const categoriesService = {
  /**
   * Récupère toutes les catégories triées par nom
   */
  async getAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, created_at FROM categories ORDER BY name ASC'
      );
      return rows;
    } catch (error) {
      logger.error('categoriesService.getAll error:', error);
      throw error;
    }
  },

  /**
   * Récupère une catégorie par son ID
   */
  async getById(id: number | string) {
    try {
      const [rows]: any = await pool.query(
        'SELECT id, name, created_at FROM categories WHERE id = ?',
        [id]
      );
      if (rows.length === 0) throw new Error('Catégorie introuvable');
      return rows[0];
    } catch (error) {
      logger.error('categoriesService.getById error:', error);
      throw error;
    }
  },

  /**
   * Crée une nouvelle catégorie
   * Vérifie l'unicité du nom (insensible à la casse)
   */
  async create(name: string) {
    try {
      // Vérification unicité
      const [existing]: any = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
        [name.trim()]
      );
      if (existing.length > 0) {
        const err: any = new Error('Une catégorie avec ce nom existe déjà');
        err.status = 409;
        throw err;
      }

      const [result]: any = await pool.query(
        'INSERT INTO categories (name) VALUES (?)',
        [name.trim()]
      );

      logger.info(`Catégorie créée : "${name}" (id: ${result.insertId})`);
      return { id: result.insertId, name: name.trim() };
    } catch (error) {
      logger.error('categoriesService.create error:', error);
      throw error;
    }
  },

  /**
   * Met à jour le nom d'une catégorie
   */
  async update(id: number | string, name: string) {
    try {
      // Vérification unicité (en excluant la catégorie actuelle)
      const [existing]: any = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?',
        [name.trim(), id]
      );
      if (existing.length > 0) {
        const err: any = new Error('Une catégorie avec ce nom existe déjà');
        err.status = 409;
        throw err;
      }

      await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
      logger.info(`Catégorie mise à jour : id=${id}, nouveau nom="${name}"`);
      return true;
    } catch (error) {
      logger.error('categoriesService.update error:', error);
      throw error;
    }
  },

  /**
   * Supprime une catégorie (hard delete)
   */
  async delete(id: number | string) {
    try {
      const [usageRows]: any = await pool.query(
        'SELECT COUNT(*) AS count FROM products WHERE category_id = ?',
        [id]
      );
      const usageCount = Number(usageRows?.[0]?.count || 0);
      if (usageCount > 0) {
        const err: any = new Error(`Catégorie utilisée par ${usageCount} produits`);
        err.status = 400;
        throw err;
      }

      const [result]: any = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
      if (result.affectedRows === 0) throw new Error('Catégorie introuvable');
      logger.info(`Catégorie supprimée : id=${id}`);
      return true;
    } catch (error) {
      logger.error('categoriesService.delete error:', error);
      throw error;
    }
  }
};
