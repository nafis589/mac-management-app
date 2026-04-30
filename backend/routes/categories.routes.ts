import { Router, Request, Response, NextFunction } from 'express';
import { categoriesService } from '../services/categories.service.js';
import Joi from 'joi';

const router = Router();

// Schéma de validation Joi
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères',
    'any.required': 'Le nom est requis'
  })
});

/**
 * GET /api/categories
 * Récupère toutes les catégories
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoriesService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id
 * Récupère une catégorie par ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await categoriesService.getById(req.params.id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Crée une nouvelle catégorie
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const category = await categoriesService.create(value.name);
    res.status(201).json({ success: true, data: category });
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
 * PATCH /api/categories/:id
 * Met à jour une catégorie
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    await categoriesService.update(req.params.id, value.name);
    res.json({ success: true, message: 'Catégorie mise à jour' });
  } catch (serviceError: any) {
    if (serviceError.status === 409) {
      res.status(409).json({ success: false, error: serviceError.message });
      return;
    }
    next(serviceError);
  }
});

/**
 * DELETE /api/categories/:id
 * Supprime une catégorie
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await categoriesService.delete(req.params.id);
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    next(error);
  }
});

export default router;
