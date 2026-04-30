import { Router, Request, Response, NextFunction } from 'express';
import { brandsService } from '../services/brands.service.js';
import Joi from 'joi';

const router = Router();

// Schéma de validation Joi
const brandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères',
    'any.required': 'Le nom est requis'
  })
});

/**
 * GET /api/brands
 * Récupère toutes les marques
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await brandsService.getAll();
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/brands/:id
 * Récupère une marque par ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandsService.getById(req.params.id);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/brands
 * Crée une nouvelle marque
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = brandSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const brand = await brandsService.create(value.name);
    res.status(201).json({ success: true, data: brand });
  } catch (serviceError: any) {
    // Conflit : nom déjà existant
    if (serviceError.status === 409) {
      res.status(409).json({ success: false, error: serviceError.message });
      return;
    }
    next(serviceError);
  }
});

/**
 * PATCH /api/brands/:id
 * Met à jour une marque
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = brandSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    await brandsService.update(req.params.id, value.name);
    res.json({ success: true, message: 'Marque mise à jour' });
  } catch (serviceError: any) {
    if (serviceError.status === 409) {
      res.status(409).json({ success: false, error: serviceError.message });
      return;
    }
    next(serviceError);
  }
});

/**
 * DELETE /api/brands/:id
 * Supprime une marque
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await brandsService.delete(req.params.id);
    res.json({ success: true, message: 'Marque supprimée' });
  } catch (error) {
    next(error);
  }
});

export default router;
