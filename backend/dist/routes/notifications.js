"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const notificationController_1 = require("../controller/notificationController");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(authMiddleware_1.requireAuth);
router.get('/', notificationController_1.getNotifications);
router.get('/unread-count', notificationController_1.getUnreadCount);
router.patch('/:id/read', notificationController_1.markAsRead);
router.patch('/mark-all-read', notificationController_1.markAllAsRead);
router.delete('/:id', notificationController_1.deleteNotification);
exports.default = router;
