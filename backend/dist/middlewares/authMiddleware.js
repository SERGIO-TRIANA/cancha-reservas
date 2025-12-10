"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET ?? 'secret';
const requireAuth = (req, res, next) => {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (!token)
        return res.status(401).json({ message: 'No autenticado' });
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};
exports.requireAuth = requireAuth;
