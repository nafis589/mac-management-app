import { Router, Request, Response, NextFunction } from 'express';
import { stockService } from '../services/stock.service.js';
import Joi from 'joi';

const router = Router();

const createStockSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().positive().required(),
  type: Joi.string().valid('IN', 'OUT').default('IN'),
  user_id: Joi.number().integer().optional()
});

const updateStockSchema = Joi.object({
  product_id: Joi.number().integer(),
  quantity: Joi.number().integer().positive(),
  type: Joi.string().valid('IN', 'OUT')
});

// GET /api/stock/dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dashboard = await stockService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

// GET /api/stock/alerts
router.get('/alerts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const alerts = await stockService.getLowStockAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// GET /api/stock
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query;
    const movements = await stockService.getAll(filters);
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
});

// GET /api/stock/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const movement = await stockService.getById(id);
    res.json({ success: true, data: movement });
  } catch (error) {
    if ((error as any).message === 'Stock movement not found') {
      res.status(404).json({ success: false, error: 'Stock movement not found' });
      return;
    }
    next(error);
  }
});

// POST /api/stock
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createStockSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    
    // Inject user_id if not present but we have an authenticated user (assuming req.user exists from auth middleware)
    const userId = value.user_id || (req as any).user?.id || 1; // Defaulting to 1 if no auth for test

    const result = await stockService.create({ ...value, user_id: userId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if ((error as any).message === 'Product not found') {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    if ((error as any).message === 'Stock insuffisant') {
      res.status(400).json({ success: false, error: 'Stock insuffisant' });
      return;
    }
    next(error);
  }
});

// PATCH /api/stock/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const { error, value } = updateStockSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    await stockService.update(id, value);
    res.json({ success: true, message: 'Stock movement updated successfully' });
  } catch (error) {
    if ((error as any).message === 'Stock movement not found') {
      res.status(404).json({ success: false, error: 'Stock movement not found' });
      return;
    }
    if ((error as any).message === 'Product not found') {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    if ((error as any).message.includes('Stock insuffisant')) {
      res.status(400).json({ success: false, error: 'Stock insuffisant' });
      return;
    }
    next(error);
  }
});

// DELETE /api/stock/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    await stockService.delete(id);
    res.json({ success: true, message: 'Stock movement deleted successfully' });
  } catch (error) {
    if ((error as any).message === 'Stock movement not found') {
      res.status(404).json({ success: false, error: 'Stock movement not found' });
      return;
    }
    next(error);
  }
});

export default router;
