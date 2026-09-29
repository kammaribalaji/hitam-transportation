import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'hitam_transport_jwt_secret_key_2026_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d';

export const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

export const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET);

