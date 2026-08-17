import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { withPaymentStatus } from '../lib/paymentStatus.js';

const safeUser = (u) => {
  const { passwordHash, ...rest } = u;
  return withPaymentStatus(rest);
};

export const getAllStudents = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = { role: { in: ['STUDENT', 'STAFF'] } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { boardingPoint: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { rollNumber: 'asc' } }),
      prisma.user.count({ where }),
    ]);
    res.json({
      students: students.map(safeUser),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentByRoll = async (req, res, next) => {
  try {
    const roll = String(req.params.rollNo).trim().toUpperCase();
    const student = await prisma.user.findFirst({ where: { rollNumber: roll, role: { in: ['STUDENT', 'STAFF'] } } });
    if (!student) throw new AppError('Student not found', 404);
    res.json(safeUser(student));
  } catch (err) {
    next(err);
  }
};

export const getStudentMe = async (req, res, next) => {
  try {
    const student = await prisma.user.findFirst({ where: { rollNumber: req.user.rollNumber } });
    if (!student) throw new AppError('Student not found', 404);
    res.json(safeUser(student));
  } catch (err) {
    next(err);
  }
};
