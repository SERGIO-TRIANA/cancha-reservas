import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET ?? 'secret';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No autenticado' });

  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
