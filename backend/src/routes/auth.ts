import { Router } from 'express';
import { register, login, logout, me, deleteAccount } from '../controller/authController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.delete('/account', requireAuth, deleteAccount);

export default router;
