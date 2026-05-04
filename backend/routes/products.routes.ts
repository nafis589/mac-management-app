import { Router, Request, Response, NextFunction } from 'express';
import { productsService } from '../services/products.service.js';
import Joi from 'joi';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Résolution du chemin __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
// Multer en mémoire — utilisé sur TOUTES les routes qui reçoivent du FormData
const upload = multer({ storage: multer.memoryStorage() });

// Options Joi : convert:true permet de coercer les strings en nombres (FormData envoie tout en string)
const JOI_OPTIONS = { convert: true, stripUnknown: true };

const createProductSchema = Joi.object({
  name: Joi.string().min(2).required(),
  category_id: Joi.number().integer().allow(null, ''),
  brand_id: Joi.number().integer().allow(null, ''),
  size: Joi.string().allow(null, ''),
  color: Joi.string().allow(null, ''),
  condition: Joi.string().valid('EXCELLENT', 'VERY_GOOD', 'GOOD').required(),
  purchase_price: Joi.number().positive().allow(null, ''),
  sale_price: Joi.number().positive().required(),
  quantity: Joi.number().integer().min(0).default(0),
  min_stock: Joi.number().integer().min(0).default(2),
  description: Joi.string().allow(null, ''),
  // Champs supplémentaires ignorés envoyés par le frontend
  status: Joi.string().allow(null, ''),
  barcode: Joi.string().allow(null, ''),
  reference: Joi.string().allow(null, ''),
  in_stock: Joi.any(),
  charge_tax: Joi.any(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2),
  category_id: Joi.number().integer().allow(null, ''),
  brand_id: Joi.number().integer().allow(null, ''),
  size: Joi.string().allow(null, ''),
  color: Joi.string().allow(null, ''),
  condition: Joi.string().valid('EXCELLENT', 'VERY_GOOD', 'GOOD'),
  purchase_price: Joi.number().positive().allow(null, ''),
  sale_price: Joi.number().positive(),
  quantity: Joi.number().integer().min(0),
  min_stock: Joi.number().integer().min(0),
  description: Joi.string().allow(null, ''),
  status: Joi.string().allow(null, ''),
  barcode: Joi.string().allow(null, ''),
  reference: Joi.string().allow(null, ''),
  in_stock: Joi.any(),
  charge_tax: Joi.any(),
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

router.get('/deleted', async (req, res, next) => {
  try {
    const deletedData = await productsService.getDeleted();
    res.json({ success: true, data: deletedData });
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

// POST /api/products — multipart/form-data (photos incluses dans le même appel)
router.post('/', upload.array('photos', 5), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = createProductSchema.validate(req.body, JOI_OPTIONS);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    // 1. Créer le produit
    value.user_id = (req as any).user?.id || 1;
    const result = await productsService.create(value);

    // 2. Si des photos sont jointes, les uploader immédiatement
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      await productsService.uploadPhotos(result.id, files);
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/products/:id — multipart/form-data (photos optionnelles)
router.patch('/:id', upload.array('photos', 5), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, JOI_OPTIONS);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    value.user_id = (req as any).user?.id || 1;
    await productsService.update(req.params.id as string, value);

    // Upload de nouvelles photos si présentes
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      await productsService.uploadPhotos(req.params.id as string, files);
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id || 1;
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

// ─── DELETE /api/products/:id/photos/:index ───────────────────────────────
// Supprime une image d'un produit par son index dans le tableau JSON.
// 1. Récupère les photos du produit en base
// 2. Supprime le fichier physique sur le disque
// 3. Retire l'entrée du tableau et met à jour la base
// Contrainte : il doit rester au moins 1 photo après suppression.
router.delete('/:id/photos/:index', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, index } = req.params;
    const photoIndex = parseInt(index, 10);

    // Validation de l'index
    if (isNaN(photoIndex) || photoIndex < 0) {
      res.status(400).json({ success: false, error: 'Index invalide' });
      return;
    }

    // Récupérer le pool depuis la config database
    const dbModule = await import('../config/database.js');
    const pool = dbModule.default;
    const [products] = await pool.query(
      'SELECT photos FROM products WHERE id = ?',
      [id]
    ) as any;

    if (!products || products.length === 0) {
      res.status(404).json({ success: false, error: 'Produit non trouvé' });
      return;
    }

    // Parser le JSON photos
    let photos: string[] = [];
    try {
      const raw = products[0].photos;
      photos = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch {
      photos = [];
    }

    // Vérifier que l'index est valide
    if (photoIndex >= photos.length) {
      res.status(400).json({ success: false, error: `Index ${photoIndex} hors limites (${photos.length} photos)` });
      return;
    }

    // Interdire la suppression si c'est la dernière photo
    if (photos.length <= 1) {
      res.status(400).json({ success: false, error: 'Impossible de supprimer la dernière photo du produit' });
      return;
    }

    // Supprimer le fichier physique sur le disque
    const photoPath = photos[photoIndex];
    // __dirname pointe vers backend/routes/ → remonter de 2 niveaux pour atteindre la racine du projet
    const fullPath = path.join(__dirname, '../..', photoPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Retirer l'entrée du tableau
    photos.splice(photoIndex, 1);

    // Mettre à jour la base de données
    await pool.query(
      'UPDATE products SET photos = ? WHERE id = ?',
      [JSON.stringify(photos), id]
    );

    res.json({ success: true, data: { photos } });

  } catch (error) {
    next(error);
  }
});

export default router;
