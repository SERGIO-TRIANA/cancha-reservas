"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.deleteNotification = deleteNotification;
exports.createNotification = createNotification;
const db_1 = __importDefault(require("../db"));
// Obtener todas las notificaciones del usuario autenticado
async function getNotifications(req, res) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    try {
        const result = await db_1.default.query(`SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC`, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
}
// Obtener contador de notificaciones no leídas
async function getUnreadCount(req, res) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    try {
        const result = await db_1.default.query(`SELECT COUNT(*) as count FROM notifications 
             WHERE user_id = $1 AND is_read = FALSE`, [userId]);
        res.json({ count: parseInt(result.rows[0].count) });
    }
    catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: 'Error al obtener contador' });
    }
}
// Marcar una notificación como leída
async function markAsRead(req, res) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    try {
        const result = await db_1.default.query(`UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
}
// Marcar todas las notificaciones como leídas
async function markAllAsRead(req, res) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    try {
        await db_1.default.query(`UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1 AND is_read = FALSE`, [userId]);
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    }
    catch (err) {
        console.error('Error marking all as read:', err);
        res.status(500).json({ error: 'Error al marcar todas como leídas' });
    }
}
// Eliminar una notificación
async function deleteNotification(req, res) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    try {
        const result = await db_1.default.query(`DELETE FROM notifications 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        res.json({ message: 'Notificación eliminada' });
    }
    catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
}
// Función helper para crear notificaciones (será llamada cuando se cancele/modifique una reserva)
async function createNotification(userId, type, title, message, reservationId) {
    try {
        await db_1.default.query(`INSERT INTO notifications (user_id, reservation_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`, [userId, reservationId || null, type, title, message]);
    }
    catch (err) {
        console.error('Error creating notification:', err);
    }
}
