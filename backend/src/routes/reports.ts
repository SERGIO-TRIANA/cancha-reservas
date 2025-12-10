import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import db from '../db';

const router = Router();

// Obtener estadísticas generales de las canchas del owner
router.get('/owner/reports/summary', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    
    const query = `
      SELECT 
        COUNT(DISTINCT rh.court_id) as total_courts,
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN rh.status IN ('completed', 'confirmed') THEN 1 END) as completed_reservations,
        COUNT(CASE WHEN rh.status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COALESCE(SUM(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount END), 0) as avg_reservation_amount
      FROM reservation_history rh
      JOIN courts c ON c.id = rh.court_id
      WHERE c.owner_id = $1
    `;
    
    const result = await db.query(query, [ownerId]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get reports summary error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener reporte detallado por cancha
router.get('/owner/reports/by-court', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    
    const query = `
      SELECT 
        c.id as court_id,
        c.name as court_name,
        c.location as court_location,
        COUNT(rh.id) as total_reservations,
        COUNT(CASE WHEN rh.status IN ('completed', 'confirmed') THEN 1 END) as completed_reservations,
        COUNT(CASE WHEN rh.status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COALESCE(SUM(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount END), 0) as avg_reservation_amount,
        MIN(rh.completed_at) as first_reservation_date,
        MAX(rh.completed_at) as last_reservation_date
      FROM courts c
      LEFT JOIN reservation_history rh ON rh.court_id = c.id
      WHERE c.owner_id = $1
      GROUP BY c.id, c.name, c.location
      ORDER BY total_revenue DESC
    `;
    
    const result = await db.query(query, [ownerId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get reports by court error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener reporte de ingresos por periodo (mensual)
router.get('/owner/reports/revenue-by-month', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const { months = 12 } = req.query; // últimos 12 meses por defecto
    
    const query = `
      SELECT 
        TO_CHAR(rh.completed_at, 'YYYY-MM') as month,
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN rh.status IN ('completed', 'confirmed') THEN 1 END) as completed_reservations,
        COALESCE(SUM(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount ELSE 0 END), 0) as revenue
      FROM reservation_history rh
      JOIN courts c ON c.id = rh.court_id
      WHERE c.owner_id = $1 
        AND rh.completed_at >= CURRENT_DATE - INTERVAL '1 month' * $2
      GROUP BY TO_CHAR(rh.completed_at, 'YYYY-MM')
      ORDER BY month DESC
    `;
    
    const result = await db.query(query, [ownerId, months]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get revenue by month error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener historial completo con filtros
router.get('/owner/reports/history', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const { court_id, status, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        rh.*,
        c.name as court_name,
        c.location as court_location,
        u.fullname as user_fullname,
        u.email as user_email
      FROM reservation_history rh
      JOIN courts c ON c.id = rh.court_id
      JOIN users u ON u.id = rh.user_id
      WHERE c.owner_id = $1
    `;
    
    const params: any[] = [ownerId];
    let paramCount = 1;
    
    if (court_id) {
      paramCount++;
      query += ` AND rh.court_id = $${paramCount}`;
      params.push(court_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND rh.status = $${paramCount}`;
      params.push(status);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND rh.start_time >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND rh.end_time <= $${paramCount}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY rh.completed_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // También obtener el conteo total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM reservation_history rh
      JOIN courts c ON c.id = rh.court_id
      WHERE c.owner_id = $1
    `;
    const countParams: any[] = [ownerId];
    let countParamIdx = 1;
    
    if (court_id) {
      countParamIdx++;
      countQuery += ` AND rh.court_id = $${countParamIdx}`;
      countParams.push(court_id);
    }
    if (status) {
      countParamIdx++;
      countQuery += ` AND rh.status = $${countParamIdx}`;
      countParams.push(status);
    }
    if (start_date) {
      countParamIdx++;
      countQuery += ` AND rh.start_time >= $${countParamIdx}`;
      countParams.push(start_date);
    }
    if (end_date) {
      countParamIdx++;
      countQuery += ` AND rh.end_time <= $${countParamIdx}`;
      countParams.push(end_date);
    }
    
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (err) {
    console.error('Get reservation history error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener los clientes más frecuentes
router.get('/owner/reports/top-customers', requireAuth, async (req, res) => {
  try {
    const ownerId = (req as any).userId;
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT 
        u.id as user_id,
        u.fullname,
        u.email,
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN rh.status IN ('completed', 'confirmed') THEN 1 END) as completed_reservations,
        COALESCE(SUM(CASE WHEN rh.payment_status = 'paid' THEN rh.total_amount ELSE 0 END), 0) as total_spent,
        MAX(rh.completed_at) as last_reservation_date
      FROM reservation_history rh
      JOIN courts c ON c.id = rh.court_id
      JOIN users u ON u.id = rh.user_id
      WHERE c.owner_id = $1
      GROUP BY u.id, u.fullname, u.email
      ORDER BY total_reservations DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [ownerId, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get top customers error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
