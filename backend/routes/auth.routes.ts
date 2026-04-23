import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Identifiant et mot de passe requis.' });
    }

    const user = await AuthService.login(username, password);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
    }

    return res.json({ success: true, data: user });

  } catch (error: any) {
    if (error.message && error.message.includes('verrouillé')) {
       return res.status(429).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Erreur interne du serveur.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'ID utilisateur requis.' });
    }

    await AuthService.logout(Number(userId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erreur interne du serveur.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ success: false, error: 'ID utilisateur et nouveau mot de passe requis.' });
    }

    await AuthService.resetPassword(Number(userId), newPassword);
    
    return res.json({ success: true, message: 'Mot de passe réinitialisé.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Erreur lors de la réinitialisation.' });
  }
});

export default router;
