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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findFirst({ where: { rollNumber: decoded.rollNumber } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    const { passwordHash, ...safeUser } = user;
    req.user = serialize(safeUser);
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
