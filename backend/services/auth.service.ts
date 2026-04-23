import bcrypt from 'bcrypt';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import CONSTANTS from '../config/constants.js';

export class AuthService {
  /**
   * Log a failed login attempt
   */
  static async logFailedAttempt(username: string) {
    try {
      await db.query(
        'INSERT INTO logs (action, details) VALUES (?, ?)',
        ['LOGIN_FAILED', JSON.stringify({ username })]
      );
    } catch (error) {
      logger.error('Failed to log failed attempt', { error, username });
    }
  }

  /**
   * Check if a user is currently locked out
   */
  static async checkLockout(username: string): Promise<boolean> {
    try {
      const lockDurationMs = CONSTANTS.LOCKOUT_DURATION_MS || 5 * 60 * 1000;
      const maxAttempts = CONSTANTS.MAX_LOGIN_ATTEMPTS || 5;

      const [rows]: any = await db.query(
        `SELECT COUNT(*) as attempts 
         FROM logs 
         WHERE action = 'LOGIN_FAILED' 
         AND JSON_EXTRACT(details, '$.username') = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [username, Math.floor(lockDurationMs / 1000)]
      );
      
      const attempts = rows[0]?.attempts || 0;
      return attempts >= maxAttempts;
    } catch (error) {
      logger.error('checkLockout error:', { error, username });
      throw new Error('Erreur lors de la vérification du verrouillage');
    }
  }

  /**
   * Authenticate a user
   */
  static async login(username: string, password: string): Promise<any> {
    try {
      // 1. Vérifier verrouillage
      const isLocked = await this.checkLockout(username);
      if (isLocked) {
        logger.warn('Lockout triggered for username', { username });
        throw new Error('Compte verrouillé (5 tentatives récentes échouées). Réessayez plus tard.');
      }

      // 2. Traiter le select
      const [users]: any = await db.query(
        'SELECT * FROM users WHERE username = ? AND status = ?',
        [username, CONSTANTS.STATUS.ACTIVE]
      );

      if (!users || users.length === 0) {
        await this.logFailedAttempt(username);
        return null;
      }

      const user = users[0];

      // 3. Vérifier mot de passe
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        await this.logFailedAttempt(username);
        return null;
      }

      // 4. Succès: Logge l'action
      await db.query(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [user.id, 'LOGIN']
      );

      // Ne JAMAIS retourner le hash
      delete user.password;
      return user;

    } catch (error: any) {
      logger.error('login error:', { error: error.message || error, username });
      throw error;
    }
  }

  /**
   * Reset a user's password
   */
  static async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      // Valider force (min 8, 1 majuscule, 1 chiffre)
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        throw new Error('Le mot de passe doit faire au moins 8 caractères, contenir 1 majuscule et 1 chiffre.');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const [result]: any = await db.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      await db.query(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [userId, 'PASSWORD_RESET']
      );

      return true;
    } catch (error: any) {
      logger.error('resetPassword error:', { error: error.message || error, userId });
      throw error;
    }
  }

  /**
   * Log out a user 
   */
  static async logout(userId: number): Promise<boolean> {
    try {
      await db.query(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [userId, 'LOGOUT']
      );
      return true;
    } catch (error: any) {
      logger.error('logout error:', { error: error.message || error, userId });
      throw error;
    }
  }
}

export default AuthService;
