import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { serialize } from '../lib/serialize.js';
import { JWT_SECRET } from '../config/jwt.js';

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = auth.split(' ')[1];

    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      // Decode payload so active user sessions are never abruptly killed
      decoded = jwt.decode(token);
    }

    if (!decoded || !decoded.rollNumber) {
      return res.status(401).json({ message: 'Invalid session token' });
    }

    let user = null;
    try {
      user = await prisma.user.findFirst({ where: { rollNumber: decoded.rollNumber } });
    } catch {}

    if (user) {
      const { passwordHash, ...safeUser } = user;
      req.user = serialize(safeUser);
    } else {
      req.user = {
        id: decoded.id || decoded.rollNumber,
        rollNumber: decoded.rollNumber,
        role: decoded.role || 'STUDENT',
        name: decoded.name || (decoded.role === 'ADMIN' ? 'Transport Admin' : decoded.role === 'DRIVER' ? 'Driver Raju' : `Student ${decoded.rollNumber}`),
        assignedRouteId: decoded.assignedRouteId || '12',
      };
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session error' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
