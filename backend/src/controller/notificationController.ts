import { Request, Response } from 'express';
import db from '../db';
import { Notification } from '../types/notification';

// Obtener todas las notificaciones del usuario autenticado
export async function getNotifications(req: Request, res: Response) {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const result = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
}

// Obtener contador de notificaciones no leídas
export async function getUnreadCount(req: Request, res: Response) {
    const userId = (req as any).userId;
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const result = await db.query(
            `SELECT COUNT(*) as count FROM notifications 
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: 'Error al obtener contador' });
    }
}

// Marcar una notificación como leída
export async function markAsRead(req: Request, res: Response) {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const result = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
}

// Marcar todas las notificaciones como leídas
export async function markAllAsRead(req: Request, res: Response) {
    const userId = (req as any).userId;

    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        await db.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
        console.error('Error marking all as read:', err);
        res.status(500).json({ error: 'Error al marcar todas como leídas' });
    }
}

// Eliminar una notificación
export async function deleteNotification(req: Request, res: Response) {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    try {
        const result = await db.query(
            `DELETE FROM notifications 
             WHERE id = $1 AND user_id = $2 
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        res.json({ message: 'Notificación eliminada' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
}

// Función helper para crear notificaciones (será llamada cuando se cancele/modifique una reserva)
export async function createNotification(
    userId: number,
    type: 'reservation_cancelled' | 'reservation_modified' | 'general',
    title: string,
    message: string,
    reservationId?: number
) {
    try {
        console.log('createNotification called with:', { userId, type, title, message, reservationId });
        const result = await db.query(
            `INSERT INTO notifications (user_id, reservation_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, reservationId || null, type, title, message]
        );
        console.log('Notification inserted:', result.rows[0]);
    } catch (err) {
        console.error('Error creating notification:', err);
    }
}
