import { Router } from 'express';
import { salesService } from '../services/sales.service.js';
import logger from '../utils/logger.js';

const router = Router();

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const sales = await salesService.getHistory(req.query);
    res.json({ success: true, data: sales });
  } catch (error: any) {
    logger.error('GET /sales error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    res.json({ success: true, data: sale });
  } catch (error: any) {
    logger.error(`GET /sales/${req.params.id} error:`, error);
    if (error.message === 'Sale not found') {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
});

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { items, ...saleData } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'La vente doit contenir des articles (items)' });
    }
    const result = await salesService.createSale(saleData, items);
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('POST /sales error:', error);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la création de la vente' });
  }
});

// PATCH /api/sales/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { reason, adminId } = req.body;
    if (!reason || !adminId) {
      return res.status(400).json({ success: false, error: 'Les champs reason et adminId sont requis' });
    }
    const result = await salesService.cancelSale(req.params.id, reason, adminId);
    res.json(result);
  } catch (error: any) {
    logger.error(`PATCH /sales/${req.params.id}/cancel error:`, error);
    res.status(400).json({ success: false, error: error.message || "Erreur lors de l'annulation de la vente" });
  }
});

// PATCH /api/sales/:id (generic, blocked)
router.patch('/:id', async (req, res) => {
  res.status(400).json({ success: false, error: 'Les ventes ne peuvent pas être modifiées directement, utilisez /cancel' });
});

// DELETE /api/sales/:id (generic, blocked)
router.delete('/:id', async (req, res) => {
  res.status(400).json({ success: false, error: 'Les ventes ne peuvent pas être supprimées physiquement, utilisez /cancel' });
});

export default router;
