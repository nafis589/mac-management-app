import { jest } from '@jest/globals';
import { productsService } from '../services/products.service.js';
import pool from '../config/database.js';
import { createMockConnection, mysqlRows, mysqlInsert } from './setup.js';
import logger from '../utils/logger.js';

describe('ProductsService', () => {
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

  describe('create', () => {
    it('devrait créer un produit et retourner l\'id et la référence', async () => {
      mockConnection.query
        .mockResolvedValueOnce(mysqlRows([{ count: 0 }]) as any)
        .mockResolvedValueOnce(mysqlInsert(50) as any);

      const productData = {
        name: 'T-Shirt Test',
        category_id: 1,
        brand_id: 1,
        sale_price: 20,
        quantity: 10,
        min_stock: 2,
        condition: 'GOOD'
      };

      const result = await productsService.create(productData);

      expect(result.id).toBe(50);
      expect(result.reference).toMatch(/PRD-\d{8}-001/);
      expect(mockConnection.commit).toHaveBeenCalled();

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        expect.any(Array)
      );
    });
  });

  describe('getAll', () => {
    it('devrait retourner les résultats corrects avec filtres', async () => {
      const mockProducts = [
        { id: 1, name: 'Product A', category_id: 2 }
      ];
      const poolQuerySpy = jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows(mockProducts) as any);

      const filters = { search: 'Test', category_id: 2 };
      const result = await productsService.getAll(filters);

      expect(result).toEqual(mockProducts);
      
      expect(poolQuerySpy).toHaveBeenCalledWith(
        expect.stringContaining('p.name LIKE ?'),
        expect.arrayContaining(['%Test%', 2])
      );
    });
  });

  describe('delete', () => {
    it('devrait effectuer un delete et logguer l\'action', async () => {
      const mockProduct = { id: 50, reference: 'PRD-123' };
      
      mockConnection.query
        .mockResolvedValueOnce(mysqlRows([mockProduct]) as any)
        .mockResolvedValueOnce([{}, undefined] as any)
        .mockResolvedValueOnce([{}, undefined] as any);

      const result = await productsService.delete(50, 1);

      expect(result).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
      
      expect(mockConnection.query).toHaveBeenCalledWith(
        'DELETE FROM products WHERE id = ?',
        [50]
      );
      
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO logs'),
        [1, 'DELETE_PRODUCT', expect.stringContaining('PRD-123')]
      );
    });
  });

  describe('getById', () => {
    it('devrait retourner le produit s\'il existe', async () => {
      const mockProduct = { id: 1, name: 'Prod' };
      const poolQuerySpy = jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([mockProduct]) as any);
      const result = await productsService.getById(1);
      expect(result).toEqual(mockProduct);
      expect(poolQuerySpy).toHaveBeenCalledWith(expect.stringContaining('WHERE p.id = ?'), [1]);
    });
    it('devrait throw si le produit n\'existe pas', async () => {
      jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([]) as any);
      await expect(productsService.getById(999)).rejects.toThrow('Product not found');
    });
  });

  describe('search', () => {
    it('devrait retourner des produits', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query').mockResolvedValueOnce(mysqlRows([{ id: 1 }]) as any);
      const result = await productsService.search('test');
      expect((result as any).length).toBe(1);
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un produit', async () => {
      const poolQuerySpy = jest.spyOn(pool, 'query').mockResolvedValueOnce([{}, undefined] as any);
      const result = await productsService.update(1, { name: 'New Name' });
      expect(result).toBe(true);
      expect(poolQuerySpy).toHaveBeenCalledWith(expect.stringContaining('UPDATE products SET'), ['New Name', 1]);
    });
  });
});
