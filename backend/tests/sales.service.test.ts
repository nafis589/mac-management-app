import { jest } from '@jest/globals';
import { salesService } from '../services/sales.service.js';
import pool from '../config/database.js';
import { createMockConnection, mysqlRows, mysqlInsert, mysqlUpdate } from './setup.js';
import logger from '../utils/logger.js';

describe('SalesService', () => {
  let mockConnection: ReturnType<typeof createMockConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    
    mockConnection = createMockConnection();
    jest.spyOn(pool, 'getConnection').mockResolvedValue(mockConnection as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createSale', () => {
    it('devrait créer une vente normalement et mettre à jour le stock', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([{ count: 0 }]) as any);
      
      mockConnection.query
        .mockResolvedValueOnce(mysqlInsert(100) as any)
        .mockResolvedValueOnce(mysqlRows([{ quantity: 10 }]) as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any);

      const saleData = { total_amount: 100, final_amount: 100, cashier_id: 1 };
      const items = [{ productId: 1, quantity: 2, unitPrice: 50 }];

      const result = await salesService.createSale(saleData, items);

      expect(result.success).toBe(true);
      expect(result.saleId).toBe(100);
      expect(result.reference).toMatch(/VTE-\d{8}-001/);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();

      expect(mockConnection.query).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [2, 1]
      );
    });

    it('devrait rollback si le stock est insuffisant', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([{ count: 0 }]) as any);
      
      mockConnection.query
        .mockResolvedValueOnce(mysqlInsert(100) as any)
        .mockResolvedValueOnce(mysqlRows([{ quantity: 1 }]) as any); // Has 1, needs 5

      const saleData = { total_amount: 100, final_amount: 100, cashier_id: 1 };
      const items = [{ productId: 1, quantity: 5, unitPrice: 20 }];

      await expect(salesService.createSale(saleData, items)).rejects.toThrow(/Insufficient stock/);

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('devrait enregistrer une vente avec remise correctement', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([{ count: 0 }]) as any);
      
      mockConnection.query
        .mockResolvedValueOnce(mysqlInsert(101) as any)
        .mockResolvedValueOnce(mysqlRows([{ quantity: 10 }]) as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any);

      const saleData = { 
        total_amount: 100, 
        discount_type: 'PERCENTAGE', 
        discount_value: 10, 
        final_amount: 90, 
        cashier_id: 1 
      };
      const items = [{ productId: 1, quantity: 1, unitPrice: 100 }];

      const result = await salesService.createSale(saleData, items);

      expect(result.success).toBe(true);
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales'),
        expect.arrayContaining([100, 'PERCENTAGE', 10, 90])
      );
    });
  });

  describe('cancelSale', () => {
    it('devrait annuler la vente et restaurer le stock', async () => {
      mockConnection.query
        .mockResolvedValueOnce(mysqlRows([{ id: 100, cancelled_at: null }]) as any)
        .mockResolvedValueOnce(mysqlUpdate(1) as any)
        .mockResolvedValueOnce(mysqlRows([{ product_id: 1, quantity: 2 }]) as any)
        .mockResolvedValueOnce(mysqlUpdate(1) as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any);

      const result = await salesService.cancelSale(100, 'Erreur de caisse', 1);

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();

      expect(mockConnection.query).toHaveBeenCalledWith(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [2, 1]
      );
      
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_movements'),
        [1, 2, 1] 
      );
    });
  });

  describe('getHistory', () => {
    it('devrait retourner l\'historique des ventes', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query')
        .mockResolvedValueOnce(mysqlRows([{ id: 1 }]) as any);
      const result = await salesService.getHistory({ date_start: '2026-01-01' });
      expect(result.length).toBe(1);
      expect(poolQuerySpy).toHaveBeenCalledWith(expect.stringContaining('s.created_at >='), ['2026-01-01']);
    });
    
    it('devrait inclure les items si demandé', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query')
        .mockResolvedValueOnce(mysqlRows([{ id: 1 }]) as any)
        .mockResolvedValueOnce(mysqlRows([{ product_id: 2 }]) as any);
      const result = await salesService.getHistory({ include_items: 'true' });
      expect(result[0].items).toBeDefined();
    });
  });

  describe('getSaleById', () => {
    it('devrait retourner une vente avec ses items', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query')
        .mockResolvedValueOnce(mysqlRows([{ id: 1 }]) as any)
        .mockResolvedValueOnce(mysqlRows([{ product_id: 2 }]) as any);
      const result = await salesService.getSaleById(1);
      expect(result.id).toBe(1);
      expect(result.items.length).toBe(1);
    });
    
    it('devrait throw si la vente n\'existe pas', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([]) as any);
      await expect(salesService.getSaleById(999)).rejects.toThrow('Sale not found');
    });
  });
});
