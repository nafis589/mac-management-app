import pool from '../config/database.js';
import logger from '../utils/logger.js';
import PDFDocument from 'pdfkit';

export const reportsService = {
  /**
   * 1. getDailyReport(date)
   */
  async getDailyReport(date: string) {
    try {
      const dailyStatsQuery = pool.isSQLite ? `SELECT 
          COUNT(*) as nbSales,
          COALESCE(SUM(s.final_amount), 0) as totalRevenue,
          COALESCE(SUM((
            SELECT COALESCE(SUM(p.purchase_price * si.quantity), 0)
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          )), 0) as totalPurchaseCost,
          COALESCE(SUM(s.final_amount - (
            SELECT COALESCE(SUM(p.purchase_price * si.quantity), 0)
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          )), 0) as profit
         FROM sales s
         WHERE date(s.created_at) = ? AND s.cancelled_at IS NULL` : `SELECT 
          COUNT(*) as nbSales,
          COALESCE(SUM(s.final_amount), 0) as totalRevenue,
          COALESCE(SUM((
            SELECT COALESCE(SUM(p.purchase_price * si.quantity), 0)
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          )), 0) as totalPurchaseCost,
          COALESCE(SUM(s.final_amount - (
            SELECT COALESCE(SUM(p.purchase_price * si.quantity), 0)
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = s.id
          )), 0) as profit
         FROM sales s
         WHERE DATE(s.created_at) = ? AND s.cancelled_at IS NULL`;
         
      const [stats]: any = await pool.query(dailyStatsQuery, [date]);

      // CA par mode paiement
      // Assuming payment_methods is an array of objects: [{ "method": "CASH", "amount": 100 }]
      // If it's array of strings, we'll adapt. Let's try to aggregate via JSON_TABLE
      const paymentsQuery = pool.isSQLite ? `SELECT 
           json_extract(value, '$.method') as method,
           SUM(json_extract(value, '$.amount')) as total
         FROM sales s, json_each(s.payment_methods)
         WHERE date(s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY json_extract(value, '$.method')` : `SELECT 
           jt.method,
           SUM(jt.amount) as total
         FROM sales s,
         JSON_TABLE(
           s.payment_methods,
           '$[*]' COLUMNS (
             method VARCHAR(50) PATH '$.method' DEFAULT '"UNKNOWN"' ON EMPTY,
             amount DECIMAL(10,2) PATH '$.amount' DEFAULT '0' ON EMPTY
           )
         ) AS jt
         WHERE DATE(s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY jt.method`;
         
      const [payments]: any = await pool.query(paymentsQuery, [date]);
      
      // Fallback si la requête ci-dessus retourne null/method=null 
      // (par exemple si payment_methods est un tableau de strings simples)
      let revenueByPayment = payments;
      if (payments.length > 0 && payments[0].method === null) {
          const altPaymentsQuery = pool.isSQLite ? `SELECT 
               value as method,
               SUM(s.final_amount) as total
             FROM sales s, json_each(s.payment_methods)
             WHERE date(s.created_at) = ? AND s.cancelled_at IS NULL
             GROUP BY value` : `SELECT 
               jt.method,
               SUM(s.final_amount) as total
             FROM sales s,
             JSON_TABLE(
               s.payment_methods,
               '$[*]' COLUMNS (
                 method VARCHAR(50) PATH '$'
               )
             ) AS jt
             WHERE DATE(s.created_at) = ? AND s.cancelled_at IS NULL
             GROUP BY jt.method`;
             
          const [altPayments]: any = await pool.query(altPaymentsQuery, [date]);
          revenueByPayment = altPayments;
      }

      const topItemsQuery = pool.isSQLite ? `SELECT 
           p.id, p.name, p.reference,
           SUM(si.quantity) as quantity_sold,
           SUM(si.quantity * si.unit_price) as total_revenue
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE date(s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY p.id, p.name, p.reference
         ORDER BY quantity_sold DESC` : `SELECT 
           p.id, p.name, p.reference,
           SUM(si.quantity) as quantity_sold,
           SUM(si.quantity * si.unit_price) as total_revenue
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE DATE(s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY p.id, p.name, p.reference
         ORDER BY quantity_sold DESC`;
         
      const [topItems]: any = await pool.query(topItemsQuery, [date]);

      const hourlySalesQuery = pool.isSQLite ? `SELECT 
           cast(strftime('%H', created_at) as integer) as hour,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE date(created_at) = ? AND cancelled_at IS NULL
         GROUP BY hour
         ORDER BY hour ASC` : `SELECT 
           HOUR(created_at) as hour,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE DATE(created_at) = ? AND cancelled_at IS NULL
         GROUP BY HOUR(created_at)
         ORDER BY hour ASC`;
         
      const [hourlySales]: any = await pool.query(hourlySalesQuery, [date]);

      return {
        nbSales: stats[0].nbSales || 0,
        totalRevenue: stats[0].totalRevenue || 0,
        totalPurchaseCost: stats[0].totalPurchaseCost || 0,
        profit: stats[0].profit || 0,
        revenueByPayment,
        topItems,
        hourlySales
      };
    } catch (error) {
      logger.error('reportsService.getDailyReport error:', error);
      throw error;
    }
  },

  /**
   * 2. getMonthlyReport(month, year)
   */
  async getMonthlyReport(month: number, year: number) {
    try {
      const monthStr = month.toString().padStart(2, '0');
      const yearStr = year.toString();
      
      const totalQuery = pool.isSQLite ? `SELECT COALESCE(SUM(final_amount), 0) as totalRevenue
         FROM sales
         WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ? AND cancelled_at IS NULL` : `SELECT COALESCE(SUM(final_amount), 0) as totalRevenue
         FROM sales
         WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? AND cancelled_at IS NULL`;
         
      const [totalResult]: any = await pool.query(totalQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);

      const prevQuery = pool.isSQLite ? `SELECT COALESCE(SUM(final_amount), 0) as prevRevenue
         FROM sales
         WHERE strftime('%m', created_at) = strftime('%m', date(printf('%04d-%02d-01', ?, ?), '-1 month'))
         AND strftime('%Y', created_at) = strftime('%Y', date(printf('%04d-%02d-01', ?, ?), '-1 month'))
         AND cancelled_at IS NULL` : `SELECT COALESCE(SUM(final_amount), 0) as prevRevenue
         FROM sales
         WHERE MONTH(created_at) = MONTH(DATE_SUB(CONCAT(?, '-', LPAD(?, 2, '0'), '-01'), INTERVAL 1 MONTH))
         AND YEAR(created_at) = YEAR(DATE_SUB(CONCAT(?, '-', LPAD(?, 2, '0'), '-01'), INTERVAL 1 MONTH))
         AND cancelled_at IS NULL`;
         
      const [prevResult]: any = await pool.query(prevQuery, [year, month, year, month]);

      const currentRev = totalResult[0].totalRevenue;
      const prevRev = prevResult[0].prevRevenue;
      const evolutionPct = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

      const weeklyQuery = pool.isSQLite ? `SELECT 
           cast(strftime('%W', created_at) as integer) as week_number,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ? AND cancelled_at IS NULL
         GROUP BY week_number
         ORDER BY week_number ASC` : `SELECT 
           WEEK(created_at) as week_number,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? AND cancelled_at IS NULL
         GROUP BY WEEK(created_at)
         ORDER BY week_number ASC`;
         
      const [weeklyData]: any = await pool.query(weeklyQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);

      const dailyQuery = pool.isSQLite ? `SELECT 
           cast(strftime('%d', created_at) as integer) as day,
           COUNT(*) as nb_sales,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ? AND cancelled_at IS NULL
         GROUP BY day
         ORDER BY day ASC` : `SELECT 
           DAY(created_at) as day,
           COUNT(*) as nb_sales,
           COALESCE(SUM(final_amount), 0) as revenue
         FROM sales
         WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? AND cancelled_at IS NULL
         GROUP BY DAY(created_at)
         ORDER BY day ASC`;
         
      const [dailySales]: any = await pool.query(dailyQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);

      const topProductsQuery = pool.isSQLite ? `SELECT 
           p.id, p.name, p.reference,
           SUM(si.quantity) as total_quantity
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE strftime('%m', s.created_at) = ? AND strftime('%Y', s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY p.id, p.name, p.reference
         ORDER BY total_quantity DESC
         LIMIT 10` : `SELECT 
           p.id, p.name, p.reference,
           SUM(si.quantity) as total_quantity
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE MONTH(s.created_at) = ? AND YEAR(s.created_at) = ? AND s.cancelled_at IS NULL
         GROUP BY p.id, p.name, p.reference
         ORDER BY total_quantity DESC
         LIMIT 10`;
         
      const [topProducts]: any = await pool.query(topProductsQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);

      // Coût d'achat des produits vendus ce mois (via la jointure sale_items → products)
      // NOTE : on N'utilise PAS SUM(s.final_amount) ici car il serait compté N fois
      // (une fois par article de la vente) — bug classique de sur-comptage en JOIN.
      // Le chiffre d'affaires est déjà calculé correctement dans totalRevenue (requête séparée).
      const purchaseCostQuery = pool.isSQLite ? `SELECT
           COALESCE(SUM(si.quantity * COALESCE(p.purchase_price, 0)), 0) as total_purchase_cost
         FROM sales s
         JOIN sale_items si ON si.sale_id = s.id
         JOIN products p ON p.id = si.product_id
         WHERE strftime('%m', s.created_at) = ?
         AND strftime('%Y', s.created_at) = ?
         AND s.cancelled_at IS NULL` : `SELECT
           COALESCE(SUM(si.quantity * COALESCE(p.purchase_price, 0)), 0) as total_purchase_cost
         FROM sales s
         JOIN sale_items si ON si.sale_id = s.id
         JOIN products p ON p.id = si.product_id
         WHERE MONTH(s.created_at) = ?
         AND YEAR(s.created_at) = ?
         AND s.cancelled_at IS NULL`;

      const [purchaseCostResult]: any = await pool.query(purchaseCostQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);
      const totalPurchaseCost = Number(purchaseCostResult[0]?.total_purchase_cost ?? 0);
      // Bénéfice = CA réel - coût d'achat des produits vendus
      const monthlyProfit = currentRev - totalPurchaseCost;

      // Coût total d'acquisition du stock enregistré ce mois :
      // purchase_price × quantity pour chaque produit créé ce mois (hors supprimés)
      const newStockCostQuery = pool.isSQLite ? `SELECT COALESCE(SUM(COALESCE(purchase_price, 0) * quantity), 0) as new_stock_cost
         FROM products
         WHERE strftime('%m', created_at) = ?
         AND strftime('%Y', created_at) = ?
         AND status != 'ARCHIVED'` : `SELECT COALESCE(SUM(COALESCE(purchase_price, 0) * quantity), 0) as new_stock_cost
         FROM products
         WHERE MONTH(created_at) = ?
         AND YEAR(created_at) = ?
         AND status != 'ARCHIVED'`;

      const [newStockResult]: any = await pool.query(newStockCostQuery, pool.isSQLite ? [monthStr, yearStr] : [month, year]);

      return {
        totalRevenue: currentRev,
        previousMonthRevenue: prevRev,
        evolutionPercentage: evolutionPct,
        weeklyEvolution: weeklyData,
        dailySalesGraph: dailySales,
        topProducts,
        monthly_profit: monthlyProfit,
        new_stock_cost: newStockResult[0].new_stock_cost || 0
      };
    } catch (error) {
      logger.error('reportsService.getMonthlyReport error:', error);
      throw error;
    }
  },

  /**
   * 3. getProductReport()
   */
  async getProductReport() {
    try {
      const [topProducts]: any = await pool.query(
        `SELECT 
           p.id, p.name, p.reference,
           SUM(si.quantity) as total_sold
         FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         JOIN products p ON si.product_id = p.id
         WHERE s.cancelled_at IS NULL
         GROUP BY p.id, p.name, p.reference
         ORDER BY total_sold DESC
         LIMIT 10`
      );

      const [neverSold]: any = await pool.query(
        `SELECT p.id, p.name, p.reference, p.quantity as current_stock
         FROM products p
         LEFT JOIN sale_items si ON p.id = si.product_id
         WHERE si.id IS NULL AND p.status = 'ACTIVE'`
      );

      const [stockValue]: any = await pool.query(
        `SELECT COALESCE(SUM(purchase_price * quantity), 0) as total_value
         FROM products WHERE status = 'ACTIVE'`
      );

      const [outOfStock]: any = await pool.query(
        `SELECT id, name, reference
         FROM products
         WHERE quantity = 0 AND status = 'ACTIVE'`
      );

      return {
        topSoldProducts: topProducts,
        neverSoldProducts: neverSold,
        totalStockValue: stockValue[0].total_value,
        outOfStockItems: outOfStock
      };
    } catch (error) {
      logger.error('reportsService.getProductReport error:', error);
      throw error;
    }
  },

  /**
   * 4. getCashierReport(userId, startDate, endDate)
   */
  async getCashierReport(userId: number | string, startDate: string, endDate: string) {
    try {
      const statsQuery = pool.isSQLite ? `SELECT 
           COUNT(*) as nbSales,
           COALESCE(SUM(final_amount), 0) as totalRevenue,
           COALESCE(AVG(final_amount), 0) as averageBasket
         FROM sales
         WHERE cashier_id = ? 
           AND date(created_at) >= ? 
           AND date(created_at) <= ?
           AND cancelled_at IS NULL` : `SELECT 
           COUNT(*) as nbSales,
           COALESCE(SUM(final_amount), 0) as totalRevenue,
           COALESCE(AVG(final_amount), 0) as averageBasket
         FROM sales
         WHERE cashier_id = ? 
           AND DATE(created_at) >= ? 
           AND DATE(created_at) <= ?
           AND cancelled_at IS NULL`;
           
      const [cashierStats]: any = await pool.query(statsQuery, [userId, startDate, endDate]);

      // Comparaison avec autres caissières (ranking)
      const rankQuery = pool.isSQLite ? `SELECT 
           cashier_id,
           COALESCE(SUM(final_amount), 0) as total
         FROM sales
         WHERE date(created_at) >= ? AND date(created_at) <= ? AND cancelled_at IS NULL
         GROUP BY cashier_id
         ORDER BY total DESC` : `SELECT 
           cashier_id,
           COALESCE(SUM(final_amount), 0) as total
         FROM sales
         WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? AND cancelled_at IS NULL
         GROUP BY cashier_id
         ORDER BY total DESC`;
         
      const [rankings]: any = await pool.query(rankQuery, [startDate, endDate]);

      let rank = 0;
      for (let i = 0; i < rankings.length; i++) {
        if (rankings[i].cashier_id == userId) {
          rank = i + 1;
          break;
        }
      }

      return {
        nbSales: cashierStats[0].nbSales || 0,
        totalRevenue: cashierStats[0].totalRevenue || 0,
        averageBasket: cashierStats[0].averageBasket || 0,
        ranking: rank,
        totalCashiers: rankings.length
      };
    } catch (error) {
      logger.error('reportsService.getCashierReport error:', error);
      throw error;
    }
  },

  /**
   * 5. exportToPDF(reportData, type)
   */
  async exportToPDF(reportData: any, type: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with Logo (Using a text placeholder if logo file doesn't exist)
        doc.fontSize(20).text('FRIPERIE DE LUXE', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(16).text(`Rapport - ${type.toUpperCase()}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12);

        if (type === 'daily') {
          doc.text(`Nombre de ventes: ${reportData.nbSales}`);
          doc.text(`Chiffre d'Affaires Total: ${reportData.totalRevenue} FCFA`);
          doc.text(`Bénéfice estimé: ${reportData.profit} FCFA`);
          doc.moveDown();
          doc.text('Top Articles Vendus:', { underline: true });
          reportData.topItems.forEach((item: any) => {
            doc.text(`- ${item.name} (${item.reference}) : ${item.quantity_sold} vendus`);
          });
        } else if (type === 'monthly') {
          doc.text(`Chiffre d'Affaires du mois: ${reportData.totalRevenue} FCFA`);
          doc.text(`Evolution vs Mois Précédent: ${reportData.evolutionPercentage.toFixed(2)}%`);
          doc.moveDown();
          doc.text('Top 10 Produits:', { underline: true });
          reportData.topProducts.forEach((item: any) => {
            doc.text(`- ${item.name} : ${item.total_quantity} vendus`);
          });
        } else if (type === 'product') {
          doc.text(`Valeur Totale Stock Actuel: ${reportData.totalStockValue} FCFA`);
          doc.moveDown();
          doc.text('Top 10 Produits Vendus:', { underline: true });
          reportData.topSoldProducts.forEach((item: any) => {
            doc.text(`- ${item.name} : ${item.total_sold} vendus`);
          });
          doc.moveDown();
          doc.text(`Articles en rupture: ${reportData.outOfStockItems.length}`);
        } else if (type === 'cashier') {
          doc.text(`Nombre de ventes réalisées: ${reportData.nbSales}`);
          doc.text(`Chiffre d'Affaires généré: ${reportData.totalRevenue} FCFA`);
          doc.text(`Panier moyen: ${reportData.averageBasket} FCFA`);
          doc.text(`Classement: ${reportData.ranking} sur ${reportData.totalCashiers}`);
        }

        doc.end();
      } catch (error) {
        logger.error('reportsService.exportToPDF error:', error);
        reject(error);
      }
    });
  },

  /**
   * 6. exportToCSV(reportData, type)
   */
  async exportToCSV(reportData: any, type: string): Promise<string> {
    try {
      let csvString = '';
      
      if (type === 'daily') {
        csvString += 'Nombre de Ventes,CA Total,Benefice Estime\n';
        csvString += `${reportData.nbSales},${reportData.totalRevenue},${reportData.profit}\n\n`;
        csvString += 'Top Articles\n';
        csvString += 'Reference,Nom,Quantite Vendue,Total Revenu\n';
        reportData.topItems.forEach((item: any) => {
          csvString += `${item.reference},"${item.name}",${item.quantity_sold},${item.total_revenue}\n`;
        });
      } else if (type === 'monthly') {
        csvString += 'CA Total,Evolution %\n';
        csvString += `${reportData.totalRevenue},${reportData.evolutionPercentage}\n\n`;
        csvString += 'Top Produits\n';
        csvString += 'Reference,Nom,Total Quantite\n';
        reportData.topProducts.forEach((item: any) => {
          csvString += `${item.reference},"${item.name}",${item.total_quantity}\n`;
        });
      } else if (type === 'product') {
        csvString += 'Valeur Totale Stock\n';
        csvString += `${reportData.totalStockValue}\n\n`;
        csvString += 'Top Produits Vendus\n';
        csvString += 'Reference,Nom,Total Vendu\n';
        reportData.topSoldProducts.forEach((item: any) => {
          csvString += `${item.reference},"${item.name}",${item.total_sold}\n`;
        });
      } else if (type === 'cashier') {
        csvString += 'Nb Ventes,CA Genere,Panier Moyen,Classement\n';
        csvString += `${reportData.nbSales},${reportData.totalRevenue},${reportData.averageBasket},${reportData.ranking}\n`;
      }

      return csvString;
    } catch (error) {
      logger.error('reportsService.exportToCSV error:', error);
      throw error;
    }
  }
};
