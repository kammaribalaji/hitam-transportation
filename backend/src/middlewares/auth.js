import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { serialize } from '../lib/serialize.js';

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = auth.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'hitam_transport_jwt_secret';
    const decoded = jwt.verify(token, secret);

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
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
