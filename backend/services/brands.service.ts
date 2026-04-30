import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const brandsService = {
  /**
   * Récupère toutes les marques triées par nom
   */
  async getAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, created_at FROM brands ORDER BY name ASC'
      );
      return rows;
    } catch (error) {
      logger.error('brandsService.getAll error:', error);
      throw error;
    }
  },

  /**
   * Récupère une marque par son ID
   */
  async getById(id: number | string) {
    try {
      const [rows]: any = await pool.query(
        'SELECT id, name, created_at FROM brands WHERE id = ?',
        [id]
      );
      if (rows.length === 0) throw new Error('Marque introuvable');
      return rows[0];
    } catch (error) {
      logger.error('brandsService.getById error:', error);
      throw error;
    }
  },

  /**
   * Crée une nouvelle marque
   * Vérifie l'unicité du nom (insensible à la casse)
   */
  async create(name: string) {
    try {
      // Vérification unicité
      const [existing]: any = await pool.query(
        'SELECT id FROM brands WHERE LOWER(name) = LOWER(?)',
        [name.trim()]
      );
      if (existing.length > 0) {
        const err: any = new Error('Une marque avec ce nom existe déjà');
        err.status = 409;
        throw err;
      }

      const [result]: any = await pool.query(
        'INSERT INTO brands (name) VALUES (?)',
        [name.trim()]
      );

      logger.info(`Marque créée : "${name}" (id: ${result.insertId})`);
      return { id: result.insertId, name: name.trim() };
    } catch (error) {
      logger.error('brandsService.create error:', error);
      throw error;
    }
  },

  /**
   * Met à jour le nom d'une marque
   */
  async update(id: number | string, name: string) {
    try {
      // Vérification unicité (en excluant la marque actuelle)
      const [existing]: any = await pool.query(
        'SELECT id FROM brands WHERE LOWER(name) = LOWER(?) AND id != ?',
        [name.trim(), id]
      );
      if (existing.length > 0) {
        const err: any = new Error('Une marque avec ce nom existe déjà');
        err.status = 409;
        throw err;
      }

      await pool.query('UPDATE brands SET name = ? WHERE id = ?', [name.trim(), id]);
      logger.info(`Marque mise à jour : id=${id}, nouveau nom="${name}"`);
      return true;
    } catch (error) {
      logger.error('brandsService.update error:', error);
      throw error;
    }
  },

  /**
   * Supprime une marque (hard delete)
   */
  async delete(id: number | string) {
    try {
      const [result]: any = await pool.query('DELETE FROM brands WHERE id = ?', [id]);
      if (result.affectedRows === 0) throw new Error('Marque introuvable');
      logger.info(`Marque supprimée : id=${id}`);
      return true;
    } catch (error) {
      logger.error('brandsService.delete error:', error);
      throw error;
    }
  }
};
