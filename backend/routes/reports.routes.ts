import express from 'express';
import { reportsService } from '../services/reports.service.js';

const router = express.Router();

router.get('/daily', async (req, res, next) => {
  try {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    const report = await reportsService.getDailyReport(date);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const today = new Date();
    const month = parseInt(req.query.month as string) || today.getMonth() + 1;
    const year = parseInt(req.query.year as string) || today.getFullYear();
    const report = await reportsService.getMonthlyReport(month, year);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/product', async (req, res, next) => {
  try {
    const report = await reportsService.getProductReport();
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/cashier', async (req, res, next) => {
  try {
    const userId = req.query.userId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const report = await reportsService.getCashierReport(userId, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.post('/export/pdf', async (req, res, next) => {
  try {
    const { reportData, type } = req.body;
    if (!reportData || !type) {
      return res.status(400).json({ success: false, error: 'Missing reportData or type' });
    }

    const pdfBuffer = await reportsService.exportToPDF(reportData, type);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

router.post('/export/csv', async (req, res, next) => {
  try {
    const { reportData, type } = req.body;
    if (!reportData || !type) {
      return res.status(400).json({ success: false, error: 'Missing reportData or type' });
    }

    const csvString = await reportsService.exportToCSV(reportData, type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}.csv`);
    res.send(csvString);
  } catch (error) {
    next(error);
  }
});

export default router;
