import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import AuthService from '../services/auth.service.js';
import db from '../config/database.js';
import { mysqlRows, mysqlUpdate } from './setup.js';
import logger from '../utils/logger.js';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('devrait retourner le user avec de bonnes credentials', async () => {
      const querySpy = jest.spyOn(db, 'query')
        .mockResolvedValueOnce(mysqlRows([{ attempts: 0 }]) as any)
        .mockResolvedValueOnce(mysqlRows([{ id: 1, username: 'admin', password: 'hashed_password', status: 'ACTIVE' }]) as any)
        .mockResolvedValueOnce([{}, undefined] as any);
        
      const bcryptSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

      const result = await AuthService.login('admin', 'password123');

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.username).toBe('admin');
      expect(result.password).toBeUndefined();
      
      expect(bcryptSpy).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(querySpy).toHaveBeenCalledWith(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [1, 'LOGIN']
      );
    });

    it('devrait retourner null avec un mauvais password', async () => {
      const querySpy = jest.spyOn(db, 'query')
        .mockResolvedValueOnce(mysqlRows([{ attempts: 0 }]) as any)
        .mockResolvedValueOnce(mysqlRows([{ id: 1, username: 'admin', password: 'hashed_password', status: 'ACTIVE' }]) as any)
        .mockResolvedValueOnce([{}, undefined] as any);
        
      const bcryptSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      const result = await AuthService.login('admin', 'wrong_password');

      expect(result).toBeNull();
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO logs'),
        ['LOGIN_FAILED', JSON.stringify({ username: 'admin' })]
      );
    });

    it('devrait throw une erreur de verrouillage après 5 échecs', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce(mysqlRows([{ attempts: 5 }]) as any);
      const bcryptSpy = jest.spyOn(bcrypt, 'compare');

      await expect(AuthService.login('admin', 'password')).rejects.toThrow(/Compte verrouillé/);
      expect(bcryptSpy).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('devrait throw une erreur de validation avec un password faible', async () => {
      const bcryptSpy = jest.spyOn(bcrypt, 'hash');
      await expect(AuthService.resetPassword(1, 'weak')).rejects.toThrow(/Le mot de passe doit faire au moins 8 caractères/);
      expect(bcryptSpy).not.toHaveBeenCalled();
    });

    it('devrait reset le password avec un password fort', async () => {
      const bcryptSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('new_hashed_password' as never);
      const querySpy = jest.spyOn(db, 'query')
        .mockResolvedValueOnce(mysqlUpdate(1) as any)
        .mockResolvedValueOnce([{}, undefined] as any);

      const result = await AuthService.resetPassword(1, 'StrongPass123');

      expect(result).toBe(true);
      expect(bcryptSpy).toHaveBeenCalledWith('StrongPass123', 10);
      expect(querySpy).toHaveBeenCalledWith(
        'UPDATE users SET password = ? WHERE id = ?',
        ['new_hashed_password', 1]
      );
    });
  });

  describe('logout', () => {
    it('devrait insérer un log de déconnexion', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce([{}, undefined] as any);
      const result = await AuthService.logout(1);
      expect(result).toBe(true);
      expect(querySpy).toHaveBeenCalledWith(
        'INSERT INTO logs (user_id, action) VALUES (?, ?)',
        [1, 'LOGOUT']
      );
    });
  });
});
