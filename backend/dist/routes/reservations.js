"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const db_1 = __importDefault(require("../db"));
const notificationController_1 = require("../controller/notificationController");
const router = (0, express_1.Router)();
// Crear una reserva (jugador autenticado)
router.post('/reservations', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { court_id, start_time, end_time } = req.body;
        if (!court_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'court_id, start_time and end_time are required' });
        }
        const insertSQL = `
      INSERT INTO reservations (court_id, user_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, 'confirmed')
      RETURNING *;
    `;
        const result = await db_1.default.query(insertSQL, [court_id, userId, start_time, end_time]);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        // SQLSTATE 23P01 = exclusion_violation (overlap constraint)
        if (err && err.code === '23P01') {
            return res.status(409).json({ error: 'Time slot already booked for this court' });
        }
        console.error('Create reservation error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Obtener reservas del jugador autenticado
router.get('/player/reservations', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const q = `
      SELECT r.*, c.name as court_name, c.location as court_location, c.price_per_hour
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      WHERE r.user_id = $1
      ORDER BY r.start_time DESC
    `;
        const result = await db_1.default.query(q, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Get player reservations error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Obtener reservas de las canchas del owner autenticado
router.get('/owner/reservations', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const ownerId = req.userId;
        const q = `
      SELECT r.*, c.name as court_name, c.location as court_location, c.price_per_hour, u.fullname as user_fullname, u.email as user_email
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE c.owner_id = $1
      ORDER BY r.start_time DESC
    `;
        const result = await db_1.default.query(q, [ownerId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Get owner reservations error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Eliminar una reserva (solo el owner de la cancha puede hacerlo)
router.delete('/owner/reservations/:id', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const ownerId = req.userId;
        const { id } = req.params;
        // Verify that the reservation belongs to a court owned by this user
        const checkQuery = `
      SELECT r.id FROM reservations r
      JOIN courts c ON c.id = r.court_id
      WHERE r.id = $1 AND c.owner_id = $2
    `;
        const checkResult = await db_1.default.query(checkQuery, [id, ownerId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada o no tienes permiso para eliminarla' });
        }
        // Get reservation details before deleting
        const reservationQuery = `
      SELECT r.*, c.name as court_name, u.fullname as user_fullname
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      JOIN users u ON u.id = r.user_id
      WHERE r.id = $1
    `;
        const reservationData = await db_1.default.query(reservationQuery, [id]);
        const reservation = reservationData.rows[0];
        // Delete the reservation
        const deleteQuery = `DELETE FROM reservations WHERE id = $1 RETURNING *`;
        const result = await db_1.default.query(deleteQuery, [id]);
        // Create notification for the player
        await (0, notificationController_1.createNotification)(reservation.user_id, 'reservation_cancelled', 'Reserva cancelada', `Tu reserva en ${reservation.court_name} para el ${new Date(reservation.start_time).toLocaleString('es-ES')} ha sido cancelada por el dueño de la cancha.`, parseInt(id));
        res.json({ message: 'Reserva eliminada correctamente', reservation: result.rows[0] });
    }
    catch (err) {
        console.error('Delete owner reservation error', err);
        res.status(500).json({ error: 'Error al eliminar la reserva' });
    }
});
// Cancelar una reserva (solo el player que hizo la reserva puede hacerlo)
router.delete('/player/reservations/:id', authMiddleware_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Verify that the reservation belongs to this user
        const checkQuery = `
      SELECT r.id FROM reservations r
      WHERE r.id = $1 AND r.user_id = $2
    `;
        const checkResult = await db_1.default.query(checkQuery, [id, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada o no tienes permiso para cancelarla' });
        }
        // Delete the reservation
        const deleteQuery = `DELETE FROM reservations WHERE id = $1 RETURNING *`;
        const result = await db_1.default.query(deleteQuery, [id]);
        res.json({ message: 'Reserva cancelada correctamente', reservation: result.rows[0] });
    }
    catch (err) {
        console.error('Delete player reservation error', err);
        res.status(500).json({ error: 'Error al cancelar la reserva' });
    }
});
exports.default = router;
