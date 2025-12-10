import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import db from '../db';
import { createNotification } from '../controller/notificationController';

const router = Router();

// Crear una reserva (jugador autenticado)
router.post('/reservations', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { court_id, start_time, end_time } = req.body;

    if (!court_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'court_id, start_time and end_time are required' });
    }

    const insertSQL = `
      INSERT INTO reservations (court_id, user_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, 'confirmed')
      RETURNING *;
    `;

    const result = await db.query(insertSQL, [court_id, userId, start_time, end_time]);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // SQLSTATE 23P01 = exclusion_violation (overlap constraint)
    if (err && err.code === '23P01') {
      return res.status(409).json({ error: 'Time slot already booked for this court' });
    }
    console.error('Create reservation error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener reservas del jugador autenticado
router.get('/player/reservations', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const q = `
      SELECT r.*, c.name as court_name, c.location as court_location, c.price_per_hour
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      WHERE r.user_id = $1
      ORDER BY r.start_time DESC
    `;
    const result = await db.query(q, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get player reservations error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener reservas de las canchas del owner autenticado
router.get('/owner/reservations', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const q = `
      SELECT r.*, c.name as court_name, c.location as court_location, c.price_per_hour, u.fullname as user_fullname, u.email as user_email
      FROM reservations r
      JOIN courts c ON c.id = r.court_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE c.owner_id = $1
      ORDER BY r.start_time DESC
    `;
    const result = await db.query(q, [ownerId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get owner reservations error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Eliminar una reserva (solo el owner de la cancha puede hacerlo)
router.delete('/owner/reservations/:id', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const { id } = req.params;

    // Verify that the reservation belongs to a court owned by this user
    const checkQuery = `
      SELECT r.id FROM reservations r
      JOIN courts c ON c.id = r.court_id
      WHERE r.id = $1 AND c.owner_id = $2
    `;
    const checkResult = await db.query(checkQuery, [id, ownerId]);

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
    const reservationData = await db.query(reservationQuery, [id]);
    const reservation = reservationData.rows[0];

    // Create notification for the player BEFORE deleting the reservation
    console.log('Creating notification for user:', reservation.user_id);
    await createNotification(
      reservation.user_id,
      'reservation_cancelled',
      'Reserva cancelada',
      `Tu reserva en ${reservation.court_name} para el ${new Date(reservation.start_time).toLocaleString('es-ES')} ha sido cancelada por el dueño de la cancha.`,
      parseInt(id)
    );
    console.log('Notification created successfully');

    // Delete the reservation AFTER creating the notification
    const deleteQuery = `DELETE FROM reservations WHERE id = $1 RETURNING *`;
    const result = await db.query(deleteQuery, [id]);

    res.json({ message: 'Reserva eliminada correctamente', reservation: result.rows[0] });
  } catch (err) {
    console.error('Delete owner reservation error', err);
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

// Procesar pago de una reserva (solo el player que hizo la reserva puede hacerlo)
router.post('/player/reservations/:id/pay', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify that the reservation belongs to this user
    const checkQuery = `
      SELECT r.id, r.payment_status FROM reservations r
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const checkResult = await db.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada o no tienes permiso para pagarla' });
    }

    const reservation = checkResult.rows[0];

    // Check if already paid
    if (reservation.payment_status === 'paid') {
      return res.status(400).json({ error: 'Esta reserva ya ha sido pagada' });
    }

    // Update payment status to 'paid'
    // En una implementación real, aquí se integraría con un procesador de pagos como Stripe, PayPal, etc.
    const updateQuery = `
      UPDATE reservations 
      SET payment_status = 'paid'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(updateQuery, [id]);

    res.json({ 
      message: 'Pago procesado exitosamente', 
      reservation: result.rows[0] 
    });
  } catch (err) {
    console.error('Process payment error', err);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});

// Cancelar una reserva (solo el player que hizo la reserva puede hacerlo)
router.delete('/player/reservations/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify that the reservation belongs to this user
    const checkQuery = `
      SELECT r.id FROM reservations r
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const checkResult = await db.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada o no tienes permiso para cancelarla' });
    }

    // Delete the reservation
    const deleteQuery = `DELETE FROM reservations WHERE id = $1 RETURNING *`;
    const result = await db.query(deleteQuery, [id]);

    res.json({ message: 'Reserva cancelada correctamente', reservation: result.rows[0] });
  } catch (err) {
    console.error('Delete player reservation error', err);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

export default router;
