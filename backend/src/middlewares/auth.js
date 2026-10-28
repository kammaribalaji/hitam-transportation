import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { serialize } from '../lib/serialize.js';
import { JWT_SECRET, verifyToken } from '../config/jwt.js';

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = auth.split(' ')[1];

    let decoded = null;
    try {
      decoded = verifyToken(token);
    } catch {
      // Token expired or invalid - do not silently fall back
      return res.status(401).json({ message: 'Session expired or invalid token' });
    }

    if (!decoded || !decoded.rollNumber) {
      return res.status(401).json({ message: 'Invalid session token' });
    }

    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: { rollNumber: { equals: decoded.rollNumber, mode: 'insensitive' } },
      });
    } catch {}

    if (!user) {
      return res.status(401).json({ message: 'User account not found or deactivated' });
    }

    if (user.status && user.status.toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Your account is not active. Please contact the Transport Office.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const { passwordHash, ...safeUser } = user;
    req.user = serialize(safeUser);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session error' });
  }
};

export const protectFast = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const token = auth.split(' ')[1];

    let decoded = null;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'Session expired or invalid token' });
    }

    if (!decoded || !decoded.rollNumber) {
      return res.status(401).json({ message: 'Invalid session token' });
    }

    req.user = {
      id: decoded.id || decoded.rollNumber,
      rollNumber: decoded.rollNumber,
      role: decoded.role || 'STUDENT',
      name: decoded.name || (decoded.role === 'ADMIN' ? 'Transport Admin' : decoded.role === 'DRIVER' ? 'Driver Raju' : `Student ${decoded.rollNumber}`),
      assignedRouteId: decoded.assignedRouteId || '12',
    };
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

/**
 * Backend Authorization Guard: Requires student to have completed and verified transport fee payment.
 * Admins, Drivers, and Staff pass through. Unpaid students receive 403 Forbidden.
 */
export const requirePaidStudent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.role !== 'STUDENT') {
      return next();
    }

    const roll = String(req.user.rollNumber || '').trim().toUpperCase();
    const user = await prisma.user.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
    });

    if (!user) {
      return res.status(401).json({ message: 'User account not found' });
    }

    const isPaid = Boolean(
      (user.transportFeePaid && (user.feeBalance == null || user.feeBalance <= 0)) ||
      (user.feePaidAmount > 0 && user.feeBalance <= 0)
    );

    if (!isPaid) {
      const confirmedPayment = await prisma.payment.findFirst({
        where: {
          studentRollNumber: { equals: roll, mode: 'insensitive' },
          status: 'PAID',
        },
      });

      if (!confirmedPayment) {
        return res.status(403).json({
          message: 'Access denied. Transport fee payment required to access this feature.',
          code: 'PAYMENT_REQUIRED',
          accessLevel: 'RESTRICTED_FIRST_BOOKING',
          transportFeePaid: false,
        });
      }
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Internal authorization error' });
  }
};

/**
 * Backend Authorization Guard:
 * Reusable check that verifies in PostgreSQL:
 * 1. User is authenticated.
 * 2. User role is checked (ADMIN, DRIVER, STAFF bypass; STUDENT is evaluated).
 * 3. Student account is active.
 * 4. Student's application is APPROVED in PostgreSQL (or student is existing pre-enrolled/paid student).
 *
 * If PENDING, UNDER_REVIEW, REJECTED, or inactive:
 * Returns HTTP 403 Forbidden with exact message and reason.
 */
export const requireApprovedStudent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized. Please log in.' });
    }

    if (req.user.role !== 'STUDENT') {
      return next();
    }

    const roll = String(req.user.rollNumber || '').trim().toUpperCase();
    const user = await prisma.user.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
    });

    if (!user) {
      return res.status(401).json({ message: 'Student account not found or deactivated.' });
    }

    if (user.status && user.status.toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Your account is not active. Please contact the Transport Office.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Check PostgreSQL for transport application
    const application = await prisma.transportApplication.findFirst({
      where: { rollNumber: { equals: roll, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });

    // If user is already a verified paid or enrolled transport student, allow immediately
    const isPaidOrVerified = Boolean(
      user.transportFeePaid ||
      user.isApplicationApproved ||
      (user.feePaidAmount > 0 && (user.feeBalance == null || user.feeBalance <= 0))
    );

    if (isPaidOrVerified) {
      req.dbUser = user;
      req.application = application;
      return next();
    }

    if (application) {
      if (application.status === 'PENDING' || application.status === 'UNDER_REVIEW') {
        return res.status(403).json({
          message: 'Your transport application is awaiting admin approval. You will be able to search for buses after approval.',
          code: 'APPLICATION_PENDING',
          applicationStatus: application.status,
          applicationNo: application.applicationNo,
        });
      }

      if (application.status === 'REJECTED') {
        return res.status(403).json({
          message: 'Your transport application was rejected. Please contact the Transport Office.',
          code: 'APPLICATION_REJECTED',
          applicationStatus: application.status,
          applicationNo: application.applicationNo,
          rejectionReason: application.rejectionReason,
        });
      }

      if (application.status === 'APPROVED' && (!application.accountActivated || user.status?.toUpperCase() !== 'ACTIVE')) {
        return res.status(403).json({
          message: 'Your transport application has been approved, but your account is not yet activated. Please contact the Transport Office.',
          code: 'ACCOUNT_NOT_ACTIVATED',
          applicationStatus: application.status,
          applicationNo: application.applicationNo,
        });
      }

      if (application.status !== 'APPROVED') {
        return res.status(403).json({
          message: 'Your transport application is not approved. Please contact the Transport Office.',
          code: 'APPLICATION_NOT_APPROVED',
          applicationStatus: application.status,
        });
      }
    } else {
      // If no application record exists, check if user is an existing verified paid student
      const isExistingPaid = Boolean(user.transportFeePaid);
      if (!isExistingPaid) {
        return res.status(403).json({
          message: 'Please complete and submit the college transport application form before searching for buses.',
          code: 'APPLICATION_NOT_SUBMITTED',
          applicationStatus: 'NOT_SUBMITTED',
        });
      }
    }

    req.dbUser = user;
    req.application = application;
    next();
  } catch (err) {
    console.error('requireApprovedStudent middleware error:', err);
    return res.status(500).json({ message: 'Internal authorization error' });
  }
};

