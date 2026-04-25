import { Router, Request, Response, NextFunction } from 'express';
import { productsService } from '../services/products.service.js';
import Joi from 'joi';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const createProductSchema = Joi.object({
  name: Joi.string().min(2).required(),
  category_id: Joi.number().integer().allow(null),
  brand_id: Joi.number().integer().allow(null),
  size: Joi.string().allow(null, ''),
  color: Joi.string().allow(null, ''),
  condition: Joi.string().valid('EXCELLENT', 'VERY_GOOD', 'GOOD').required(),
  purchase_price: Joi.number().positive().allow(null),
  sale_price: Joi.number().positive().required(),
  quantity: Joi.number().integer().min(0).default(0),
  min_stock: Joi.number().integer().min(0).default(2),
  description: Joi.string().allow(null, '')
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2),
  category_id: Joi.number().integer().allow(null),
  brand_id: Joi.number().integer().allow(null),
  size: Joi.string().allow(null, ''),
  color: Joi.string().allow(null, ''),
  condition: Joi.string().valid('EXCELLENT', 'VERY_GOOD', 'GOOD'),
  purchase_price: Joi.number().positive().allow(null),
  sale_price: Joi.number().positive(),
  quantity: Joi.number().integer().min(0),
  min_stock: Joi.number().integer().min(0),
  description: Joi.string().allow(null, '')
});

router.get('/', async (req, res, next) => {
  try {
    const filters = req.query;
    if (filters.search) {
      const products = await productsService.search(filters.search as string);
      res.json({ success: true, data: products });
      return;
    }
    const products = await productsService.getAll(filters);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productsService.getById(req.params.id as string);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    const result = await productsService.create(value);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    await productsService.update(req.params.id as string, value);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id; 
    await productsService.delete(req.params.id as string, userId);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/photos', upload.array('photos', 5), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No photos provided' });
        return;
    }
    const photoPaths = await productsService.uploadPhotos(req.params.id as string, files);
    res.json({ success: true, photos: photoPaths });
  } catch (error) {
    next(error);
  }
});

export default router;
