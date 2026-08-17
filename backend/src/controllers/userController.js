import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const num = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

// Whitelisted editable fields (mirrors the old Mongoose schema).
const USER_FIELDS = {
  name: (v) => String(v),
  department: (v) => String(v),
  year: (v) => String(v),
  email: (v) => String(v),
  phone: (v) => String(v),
  role: (v) => String(v).toUpperCase(),
  assignedRouteId: (v) => String(v),
  transportFeePaid: (v) => Boolean(v),
  licenseNo: (v) => String(v),
  address: (v) => String(v),
  experience: (v) => String(v),
  emergencyContact: (v) => String(v),
  assignedBusNumber: (v) => String(v),
  avatarInitial: (v) => String(v),
};

const buildUserData = (body, extra = {}) => {
  const data = { ...extra };
  for (const [key, coerce] of Object.entries(USER_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role.toUpperCase();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    res.json({ users: serializeMany(users), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getUserByRoll = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { rollNumber: req.params.rollNumber.toUpperCase() } });
    if (!user) throw new AppError('User not found', 404);
    const { passwordHash, ...safeUser } = user;
    res.json(serialize(safeUser));
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { rollNumber, name, role, password, assignedRouteId } = req.body;
    const exists = await prisma.user.findFirst({ where: { rollNumber: String(rollNumber || '').trim().toUpperCase() } });
    if (exists) throw new AppError('Roll number already exists', 400);

    const passwordHash = await bcrypt.hash(password || 'hitam123', 10);
    const data = buildUserData(req.body, {
      rollNumber: String(rollNumber || '').trim().toUpperCase(),
      name: String(name || ''),
      role: (role || 'STUDENT').toUpperCase(),
      assignedRouteId: assignedRouteId || 'R1',
      passwordHash,
      avatarInitial: name ? String(name).charAt(0).toUpperCase() : 'U',
    });
    const user = await prisma.user.create({ data });
    const { passwordHash: _ph, ...userObj } = user;
    res.status(201).json(serialize(userObj));
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { rollNumber } = req.params;
    const updates = { ...req.body };
    delete updates.passwordHash;
    delete updates.password;
    delete updates.rollNumber;

    const data = buildUserData(updates);
    if (data.name) data.avatarInitial = String(data.name).charAt(0).toUpperCase();

    const existing = await prisma.user.findFirst({ where: { rollNumber: rollNumber.toUpperCase() } });
    if (!existing) throw new AppError('User not found', 404);

    const user = await prisma.user.update({ where: { id: existing.id }, data });
    const { passwordHash, ...safeUser } = user;
    res.json(serialize(safeUser));
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({ where: { rollNumber: req.params.rollNumber.toUpperCase() } });
    if (!existing) throw new AppError('User not found', 404);
    await prisma.user.delete({ where: { id: existing.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, address, department, year } = req.body;
    const updates = { name, email, phone, address, department, year };
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
    if (updates.name) updates.avatarInitial = String(updates.name).charAt(0).toUpperCase();

    const existing = await prisma.user.findFirst({ where: { rollNumber: req.user.rollNumber } });
    if (!existing) throw new AppError('User not found', 404);

    const user = await prisma.user.update({ where: { id: existing.id }, data: buildUserData(updates) });
    const { passwordHash, ...safeUser } = user;
    res.json(serialize(safeUser));
  } catch (err) {
    next(err);
  }
};
