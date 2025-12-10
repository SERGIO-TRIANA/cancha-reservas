import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import db from '../db';
import { Court } from '../types/court';

const router = Router();

// Public: get all courts (available to players)
router.get('/courts', async (req, res) => {
  try {
    // Optionally filter by status=active only
    const result = await db.query(
      "SELECT id, name, location, owner_id, capacity, description, price_per_hour, status, sport FROM courts WHERE status = 'active' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching public courts:', err);
    res.status(500).json({ error: 'Error al obtener las canchas' });
  }
});

// Public: get single court by id (only if active)
router.get('/courts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT id, name, location, owner_id, capacity, description, price_per_hour, status, sport FROM courts WHERE id = $1 AND status = 'active'",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching court by id:', err);
    res.status(500).json({ error: 'Error al obtener la cancha' });
  }
});

// Get all courts for the authenticated owner
router.get('/owner/courts', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const result = await db.query(
      'SELECT * FROM courts WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching courts:', err);
    res.status(500).json({ error: 'Error al obtener las canchas' });
  }
});

// Get a specific court for the authenticated owner
router.get('/owner/courts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).userId;
    const result = await db.query(
      'SELECT * FROM courts WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching owner court by id:', err);
    res.status(500).json({ error: 'Error al obtener la cancha' });
  }
});

// Create a new court
router.post('/owner/courts', requireAuth, async (req, res) => {
  try {
    const { name, location, capacity, description, price_per_hour, sport } = req.body;
    const ownerId = (req as any).userId;

    const result = await db.query(
      `INSERT INTO courts (name, location, owner_id, capacity, description, price_per_hour, sport) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, location, ownerId, capacity, description, price_per_hour, sport]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating court:', err);
    if (typeof err === 'object' && err !== null && 'constraint' in err && (err as any).constraint === 'unique_court_name_per_owner') {
      return res.status(400).json({ error: 'Ya tienes una cancha con este nombre' });
    }
    res.status(500).json({ error: 'Error al crear la cancha' });
  }
});

// Update a court
router.put('/owner/courts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, capacity, status, description, price_per_hour, sport } = req.body;
    const ownerId = (req as any).userId;

    // Verify ownership
    const court = await db.query(
      'SELECT * FROM courts WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );

    if (court.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    const result = await db.query(
      `UPDATE courts 
       SET name = $1, location = $2, capacity = $3, status = $4, 
           description = $5, price_per_hour = $6, sport = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND owner_id = $9
       RETURNING *`,
      [name, location, capacity, status, description, price_per_hour, sport, id, ownerId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating court:', err);
    if (typeof err === 'object' && err !== null && 'constraint' in err && (err as any).constraint === 'unique_court_name_per_owner') {
      return res.status(400).json({ error: 'Ya tienes una cancha con este nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar la cancha' });
  }
});

// Delete a court
router.delete('/owner/courts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = (req as any).userId;

    // Verify ownership before deletion
    const result = await db.query(
      'DELETE FROM courts WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    res.json({ message: 'Cancha eliminada correctamente' });
  } catch (err) {
    console.error('Error deleting court:', err);
    res.status(500).json({ error: 'Error al eliminar la cancha' });
  }
});

export default router;