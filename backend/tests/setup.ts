/**
 * =============================================================================
 * TEST SETUP — Friperie de Luxe
 * =============================================================================
 * Mock centralisé pour :
 *   - Base de données (pool MySQL en mémoire)
 *   - Logger (silencieux en tests)
 *   - bcrypt (mocks déterministes)
 * =============================================================================
 */

import { jest } from '@jest/globals';

// ─── Types pour le mock DB ────────────────────────────────────────────────────

export interface MockConnection {
  beginTransaction: any;
  commit: any;
  rollback: any;
  release: any;
  query: any;
}

export interface MockPool {
  query: any;
  getConnection: any;
}

// ─── Création d'un mock pool réutilisable ─────────────────────────────────────

export function createMockPool(): MockPool {
  return {
    query: jest.fn(),
    getConnection: jest.fn(),
  };
}

export function createMockConnection(): MockConnection {
  return {
    beginTransaction: (jest.fn() as any).mockResolvedValue(undefined),
    commit: (jest.fn() as any).mockResolvedValue(undefined),
    rollback: (jest.fn() as any).mockResolvedValue(undefined),
    release: jest.fn(),
    query: jest.fn(),
  };
}

// ─── Mock Logger (silencieux) ─────────────────────────────────────────────────

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simule un résultat MySQL [rows] standard */
export function mysqlRows(rows: any[]): [any[], any] {
  return [rows, []];
}

/** Simule un résultat INSERT MySQL avec insertId */
export function mysqlInsert(insertId: number): [any, any] {
  return [{ insertId, affectedRows: 1 }, undefined];
}

/** Simule un résultat UPDATE/DELETE MySQL */
export function mysqlUpdate(affectedRows: number): [any, any] {
  return [{ affectedRows }, undefined];
}

/** Reset tous les mocks d'un pool et d'une connexion */
export function resetAllMocks(pool: MockPool, connection?: MockConnection) {
  pool.query.mockReset();
  pool.getConnection.mockReset();
  if (connection) {
    connection.query.mockReset();
    connection.beginTransaction.mockReset().mockResolvedValue(undefined);
    connection.commit.mockReset().mockResolvedValue(undefined);
    connection.rollback.mockReset().mockResolvedValue(undefined);
    connection.release.mockReset();
  }
  mockLogger.info.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.error.mockReset();
}
