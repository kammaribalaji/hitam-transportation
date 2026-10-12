import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { withPaymentStatus } from '../lib/paymentStatus.js';

const safeUser = (u) => {
  const { passwordHash, ...rest } = u;
  return withPaymentStatus(rest);
};

/**
 * Staff/Admin only: List students
 */
export const getAllStudents = async (req, res, next) => {
  try {
    if (req.user?.role === 'STUDENT') {
      throw new AppError('Access denied. Only transport staff and administrators can view all students.', 403);
    }

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

    return res.json({
      students: students.map(safeUser),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get student by roll number.
 * Strict ownership: A student can ONLY access their own record.
 */
export const getStudentByRoll = async (req, res, next) => {
  try {
    const roll = String(req.params.rollNo).trim().toUpperCase();

    // Data ownership check
    if (req.user?.role === 'STUDENT' && req.user?.rollNumber !== roll) {
      throw new AppError("Access denied. You cannot view another student's details.", 403);
    }

    const student = await prisma.user.findFirst({
      where: { rollNumber: roll, role: { in: ['STUDENT', 'STAFF'] } },
    });

    if (!student) {
      throw new AppError('Student record not found', 404);
    }

    return res.json(safeUser(student));
  } catch (err) {
    next(err);
  }
};

/**
 * Get currently authenticated student's profile from verified session
 */
export const getStudentMe = async (req, res, next) => {
  try {
    const roll = String(req.user?.rollNumber || '').trim().toUpperCase();
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const student = await prisma.user.findFirst({ where: { rollNumber: roll } });
    if (!student) {
      throw new AppError('Student record not found', 404);
    }

    return res.json(safeUser(student));
  } catch (err) {
    next(err);
  }
};
