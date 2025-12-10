import { Request, Response } from 'express';
import db from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { CookieOptions } from 'express';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? 'secret';
const JWT_EXPIRES_IN_RAW = process.env.JWT_EXPIRES_IN ?? '1h';
const JWT_EXPIRES_IN: number | string = (() => {
  const n = Number(JWT_EXPIRES_IN_RAW);
  return Number.isFinite(n) ? n : JWT_EXPIRES_IN_RAW;
})();

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 3600 * 1000
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullname, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });
    if (!role || !['owner', 'player'].includes(role)) return res.status(400).json({ message: 'Rol inválido' });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount > 0) return res.status(409).json({ message: 'Email ya registrado' });

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      'INSERT INTO users (email, password_hash, fullname, role) VALUES ($1, $2, $3, $4) RETURNING id, email, fullname, role',
      [normalizedEmail, password_hash, fullname, role]
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (err) {
    console.error('Error register:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

    const normalizedEmail = email.toLowerCase().trim();
    const result = await db.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [normalizedEmail]);
    if (result.rowCount === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ 
      message: 'Autenticado correctamente', 
      user: { 
        id: user.id, 
        email: user.email,
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada' });
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Include role in the response so frontend can perform role checks
    const result = await db.query('SELECT id, email, fullname, role FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Error me:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Delete user's reservations first (foreign key constraint)
    await db.query('DELETE FROM reservations WHERE user_id = $1', [userId]);
    
    // If the user is an owner, delete their courts and related reservations
    const userCheck = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userCheck.rows[0]?.role === 'owner') {
      // Get all court ids owned by this user
      const courtsResult = await db.query('SELECT id FROM courts WHERE owner_id = $1', [userId]);
      const courtIds = courtsResult.rows.map(row => row.id);
      
      if (courtIds.length > 0) {
        // Delete all reservations for these courts
        await db.query('DELETE FROM reservations WHERE court_id = ANY($1)', [courtIds]);
        // Delete the courts
        await db.query('DELETE FROM courts WHERE owner_id = $1', [userId]);
      }
    }
    
    // Finally, delete the user account
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING email', [userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Clear the auth cookie
    res.clearCookie('token');
    res.json({ message: 'Cuenta eliminada exitosamente', email: result.rows[0].email });
  } catch (err) {
    console.error('Error deleteAccount:', err);
    res.status(500).json({ message: 'Error del servidor al eliminar cuenta' });
  }
};
