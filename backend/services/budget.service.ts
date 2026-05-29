import pool from '../config/database.js';
import logger from '../utils/logger.js';

export const budgetService = {
  async createOrUpdateBudget(month: number, year: number, planned_amount: number, userId: number | string) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      if (month !== currentMonth || year !== currentYear) {
        throw new Error('Modification impossible : uniquement le mois en cours est modifiable');
      }

      const [existing]: any = await pool.query(
        'SELECT id FROM budgets WHERE month = ? AND year = ?',
        [month, year]
      );

      if (existing && existing.length > 0) {
        await pool.query(
          'UPDATE budgets SET planned_amount = ? WHERE month = ? AND year = ?',
          [planned_amount, month, year]
        );
      } else {
        await pool.query(
          'INSERT INTO budgets (month, year, planned_amount, created_by) VALUES (?, ?, ?, ?)',
          [month, year, planned_amount, userId]
        );
      }

      return await this.getBudget(month, year);
    } catch (error) {
      logger.error('budgetService.createOrUpdateBudget error:', error);
      throw error;
    }
  },

  async getCurrentBudget() {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const year = now.getFullYear();
      
      const sql = `SELECT * FROM budgets WHERE month = ? AND year = ?`;
      const [rows]: any = await pool.query(sql, [month, year]);
      return rows[0] || null;
    } catch (error) {
      logger.error('budgetService.getCurrentBudget error:', error);
      throw error;
    }
  },

  async getBudget(month: number, year: number) {
    try {
      const sql = `SELECT * FROM budgets WHERE month = ? AND year = ?`;
      const [rows]: any = await pool.query(sql, [month, year]);
      return rows[0] || null;
    } catch (error) {
      logger.error('budgetService.getBudget error:', error);
      throw error;
    }
  },

  async addExpense(data: any, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { budget_id, date, description, amount, source } = data;

      const sqlInsert = `
        INSERT INTO expenses (budget_id, date, description, amount, source, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result]: any = await connection.query(sqlInsert, [
        budget_id || null, date, description, amount, source || 'BUDGET', userId
      ]);

      if (budget_id) {
        const sqlUpdate = `
          UPDATE budgets
          SET actual_expenses = actual_expenses + ?
          WHERE id = ?
        `;
        await connection.query(sqlUpdate, [amount, budget_id]);
      }

      await connection.commit();
      return { id: result.insertId, ...data };
    } catch (error) {
      await connection.rollback();
      logger.error('budgetService.addExpense error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateExpense(id: number, data: any, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.query(
        'SELECT * FROM expenses WHERE id = ?',
        [id]
      );
      if (!existing || existing.length === 0) {
        throw new Error('Dépense introuvable');
      }
      const old = existing[0];
      const diff = Number(data.amount) - Number(old.amount);

      await connection.query(
        'UPDATE expenses SET description = ?, amount = ?, date = ?, source = ? WHERE id = ?',
        [data.description, data.amount, data.date, data.source || 'BUDGET', id]
      );

      if (diff !== 0 && old.budget_id) {
        await connection.query(
          'UPDATE budgets SET actual_expenses = actual_expenses + ? WHERE id = ?',
          [diff, old.budget_id]
        );
      }

      await connection.commit();
      return { id, ...data };
    } catch (error) {
      await connection.rollback();
      logger.error('budgetService.updateExpense error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteExpense(id: number, userId: number | string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.query(
        'SELECT * FROM expenses WHERE id = ?',
        [id]
      );
      if (!existing || existing.length === 0) {
        throw new Error('Dépense introuvable');
      }
      const expense = existing[0];

      if (expense.budget_id) {
        await connection.query(
          'UPDATE budgets SET actual_expenses = actual_expenses - ? WHERE id = ?',
          [expense.amount, expense.budget_id]
        );
      }

      await connection.query('DELETE FROM expenses WHERE id = ?', [id]);

      await connection.query(
        'INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)',
        [userId, 'EXPENSE_DELETED', JSON.stringify({ expense_id: id })]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      logger.error('budgetService.deleteExpense error:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  async getExpenses(filters: any = {}) {
    try {
      let query = `
        SELECT e.*, u.first_name, u.last_name
        FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      const countParams: any[] = [];
      let countQuery = `SELECT COUNT(*) as total FROM expenses e WHERE 1=1`;

      if (filters.budget_id) {
        query += ' AND e.budget_id = ?';
        countQuery += ' AND e.budget_id = ?';
        params.push(filters.budget_id);
        countParams.push(filters.budget_id);
      }
      if (filters.source) {
        query += ' AND e.source = ?';
        countQuery += ' AND e.source = ?';
        params.push(filters.source);
        countParams.push(filters.source);
      }
      if (filters.month && filters.year) {
        const monthStr = String(filters.month).padStart(2, '0');
        const like = `${filters.year}-${monthStr}-%`;
        query += ' AND e.date LIKE ?';
        countQuery += ' AND e.date LIKE ?';
        params.push(like);
        countParams.push(like);
      }

      query += ' ORDER BY e.date DESC, e.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(Number(filters.limit));
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(Number(filters.offset));
        }
      }

      const [rows]: any = await pool.query(query, params);
      const [countRows]: any = await pool.query(countQuery, countParams);

      return {
        data: rows,
        total: countRows[0].total
      };
    } catch (error) {
      logger.error('budgetService.getExpenses error:', error);
      throw error;
    }
  },

  async getDailyExpenses(month: number, year: number) {
    try {
      const [budgetRows]: any = await pool.query(
        'SELECT planned_amount FROM budgets WHERE month = ? AND year = ?',
        [month, year]
      );
      const planned_amount: number = budgetRows?.[0]?.planned_amount ?? 0;

      const monthStr = String(month).padStart(2, '0');
      const yearStr = String(year);

      const [expenseRows]: any = await pool.query(`
        SELECT
          strftime('%d', date) as day,
          SUM(amount) as daily_total
        FROM expenses
        WHERE strftime('%m', date) = ?
          AND strftime('%Y', date) = ?
        GROUP BY strftime('%d', date)
        ORDER BY day ASC
      `, [monthStr, yearStr]);

      const daysInMonth = new Date(year, month, 0).getDate();
      let cumul = 0;
      const data: { day: number; cumul: number; budget: number }[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const found = expenseRows?.find((e: any) => e.day === dayStr);
        cumul += found ? Number(found.daily_total) : 0;
        data.push({ day: d, cumul, budget: planned_amount });
      }

      return data;
    } catch (error) {
      logger.error('budgetService.getDailyExpenses error:', error);
      throw error;
    }
  },

  async getStats(month: number, year: number) {
    try {
      const budget = await this.getBudget(month, year);
      const planned_amount = budget?.planned_amount ?? 0;

      const monthStr = String(month).padStart(2, '0');
      const datePrefix = `${year}-${monthStr}-%`;

      // Total réel des dépenses du mois (source of truth indépendante du cache budget)
      const [totalRows]: any = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?`,
        [datePrefix]
      );
      const actual_expenses = Number(totalRows[0]?.total ?? budget?.actual_expenses ?? 0);

      const [sourceRows]: any = await pool.query(
        `SELECT source, SUM(amount) as total FROM expenses WHERE date LIKE ? GROUP BY source`,
        [datePrefix]
      );

      const by_source: any = {};
      sourceRows.forEach((row: any) => {
        by_source[row.source] = row.total;
      });

      return {
        planned_amount,
        actual_expenses,
        remaining: planned_amount - actual_expenses,
        by_category: {},
        by_source,
        stock_purchase_total: 0,
        other_expenses_total: actual_expenses,
      };
    } catch (error) {
      logger.error('budgetService.getStats error:', error);
      throw error;
    }
  }
};
