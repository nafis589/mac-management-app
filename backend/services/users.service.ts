import bcrypt from 'bcrypt';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

const createUserSchema = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*\d)/)
    .message('Le mot de passe doit faire au moins 8 caractères, contenir 1 majuscule et 1 chiffre.')
    .required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  role: Joi.string().valid('ADMIN', 'CASHIER').required(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE')
});

const updateUserSchema = Joi.object({
  first_name: Joi.string(),
  last_name: Joi.string(),
  role: Joi.string().valid('ADMIN', 'CASHIER'),
  status: Joi.string().valid('ACTIVE', 'INACTIVE')
}).min(1);

export class UsersService {
  static async create(userData: any) {
    try {
      // 1. Validation Joi
      const { error, value } = createUserSchema.validate(userData);
      if (error) {
        throw new Error(`Erreur de validation: ${error.details[0].message}`);
      }

      // 2. Vérification si username unique
      const [existing]: any = await db.query(
        'SELECT id FROM users WHERE username = ?',
        [value.username]
      );
      if (existing.length > 0) {
        throw new Error("Nom d'utilisateur déjà utilisé");
      }

      // 3. Hash password avec bcrypt (10 rounds)
      const hashedPassword = await bcrypt.hash(value.password, 10);

      // 4. INSERT INTO users
      const [result]: any = await db.query(
        'INSERT INTO users (username, password, first_name, last_name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [value.username, hashedPassword, value.first_name, value.last_name, value.role, value.status]
      );

      const userId = result.insertId;

      // 5. INSERT log (action='USER_CREATED')
      await db.query(
        'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
        [userId, 'USER_CREATED', JSON.stringify({ action_target: value.username })]
      );

      logger.info('Utilisateur créé avec succès', { userId, username: value.username });

      // 6. Retourner user créé (sans password)
      return this.getById(userId);

    } catch (error: any) {
      logger.error('UsersService.create error:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const [users]: any = await db.query('SELECT * FROM users ORDER BY created_at DESC');
      
      // Retourner sans passwords
      return users.map((u: any) => {
        const { password, ...userWithoutPwd } = u;
        return userWithoutPwd;
      });

    } catch (error: any) {
      logger.error('UsersService.getAll error:', error);
      throw error;
    }
  }

  static async getById(id: number | string) {
    try {
      const [users]: any = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      
      if (!users || users.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const user = users[0];
      // Retourner sans password
      delete user.password;
      return user;

    } catch (error: any) {
      logger.error('UsersService.getById error:', { error, userId: id });
      throw error;
    }
  }

  static async update(id: number | string, userData: any) {
    try {
      // 1. Validation Joi des entrées (pas de modification de password ici)
      const { error, value } = updateUserSchema.validate(userData);
      if (error) {
        throw new Error(`Erreur de validation: ${error.details[0].message}`);
      }

      // Vérifier si utilisateur existe
      const [existing]: any = await db.query('SELECT id FROM users WHERE id = ?', [id]);
      if (existing.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (value.first_name) {
        updates.push('first_name = ?');
        values.push(value.first_name);
      }
      if (value.last_name) {
        updates.push('last_name = ?');
        values.push(value.last_name);
      }
      if (value.role) {
        updates.push('role = ?');
        values.push(value.role);
      }
      if (value.status) {
        updates.push('status = ?');
        values.push(value.status);
      }

      if (updates.length > 0) {
        values.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(sql, values);

        // INSERT log (action='USER_UPDATED')
        await db.query(
          'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
          [id, 'USER_UPDATED', JSON.stringify(value)]
        );

        logger.info('Utilisateur mis à jour avec succès', { userId: id });
      }

      return this.getById(id);

    } catch (error: any) {
      logger.error('UsersService.update error:', { error, userId: id });
      throw error;
    }
  }

  static async deleteUser(id: number | string, currentUserId: number | string) {
    try {
      if (String(id) === String(currentUserId)) {
        throw new Error('Auto-suppression interdite');
      }

      const [users]: any = await db.query('SELECT role FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      if (users[0].role === 'ADMIN') {
        throw new Error('Admin non supprimable');
      }

      // Soft delete : UPDATE users SET status = 'INACTIVE'
      const [result]: any = await db.query(
        "UPDATE users SET status = 'INACTIVE' WHERE id = ?",
        [id]
      );

      // INSERT log (action='USER_DELETED')
      await db.query(
        'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
        [currentUserId, 'USER_DELETED', JSON.stringify({ target_id: id })]
      );

      logger.info('Utilisateur désactivé (soft delete)', { userId: id });
      return { success: true, message: 'Utilisateur supprimé (désactivé)' };

    } catch (error: any) {
      logger.error('UsersService.deleteUser error:', { error, userId: id });
      throw error;
    }
  }

  static async toggleStatus(id: number | string) {
    try {
      const [users]: any = await db.query('SELECT status FROM users WHERE id = ?', [id]);
      if (!users || users.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      // TOGGLE ACTIVE/INACTIVE
      const newStatus = users[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      
      await db.query(
        'UPDATE users SET status = ? WHERE id = ?',
        [newStatus, id]
      );

      await db.query(
        'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
        [id, 'USER_STATUS_TOGGLED', JSON.stringify({ newStatus })]
      );

      logger.info('Statut utilisateur basculé', { userId: id, newStatus });
      return { success: true, status: newStatus };

    } catch (error: any) {
      logger.error('UsersService.toggleStatus error:', { error, userId: id });
      throw error;
    }
  }
}

export default UsersService;
