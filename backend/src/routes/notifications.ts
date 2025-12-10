import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../controller/notificationController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
