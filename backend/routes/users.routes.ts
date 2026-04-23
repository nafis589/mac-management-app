import { Router } from 'express';
import UsersService from '../services/users.service.js';

const router = Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await UsersService.getAll();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await UsersService.getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const user = await UsersService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  try {
    const user = await UsersService.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await UsersService.deleteUser(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/users/:id/toggle-status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const result = await UsersService.toggleStatus(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
