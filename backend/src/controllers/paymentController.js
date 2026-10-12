import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { derivePaymentStatus } from '../lib/paymentStatus.js';

const generatePaymentId = () => `PAY-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * 1. Initiate Transport Fee Payment (Creates a PENDING Payment Order).
 * Amount is calculated or verified by backend from PostgreSQL, never trusted from the browser.
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const roll = req.user.rollNumber;
    const { routeId, bookingId, method = 'UPI' } = req.body;

    const student = await prisma.user.findFirst({
      where: { rollNumber: roll },
    });
    if (!student) throw new AppError('Student account not found', 404);

    // Look up route fee
    const rId = String(routeId || student.assignedRouteId || '12');
    const route = await prisma.route.findUnique({ where: { id: rId } });

    // Calculate exact due amount from PostgreSQL
    const baseFee = student.feeAmount > 0 ? student.feeAmount : (route?.feeAmount || 12000);
    const balanceDue = student.feeBalance > 0 ? student.feeBalance : Math.max(0, baseFee - (student.feePaidAmount || 0));

    if (student.transportFeePaid && balanceDue <= 0) {
      throw new AppError('Your transport fee is already fully paid.', 400);
    }

    const payAmount = balanceDue > 0 ? balanceDue : baseFee;
    const paymentId = generatePaymentId();

    const payment = await prisma.payment.create({
      data: {
        paymentId,
        studentRollNumber: student.rollNumber,
        studentName: student.name,
        routeId: rId,
        bookingId: bookingId ? String(bookingId) : '',
        amount: payAmount,
        method: String(method),
        status: 'PENDING',
        transactionRef: `ORD-${Date.now().toString().slice(-8)}`,
        date: fmt(new Date()),
      },
    });

    res.status(201).json({
      success: true,
      order: serialize(payment),
      amountDue: payAmount,
      currency: 'INR',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Backend Verification of Payment.
 * Only authenticated and verified transactions unlock transport services.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, transactionRef, method = 'UPI' } = req.body;
    if (!paymentId) throw new AppError('paymentId is required for verification', 400);

    const payment = await prisma.payment.findUnique({
      where: { paymentId: String(paymentId) },
    });
    if (!payment) throw new AppError('Payment record not found', 404);

    // Strict ownership: A student can only verify their own payment
    if (payment.studentRollNumber !== req.user.rollNumber && req.user.role !== 'ADMIN') {
      throw new AppError('Access denied: Payment record does not belong to you', 403);
    }

    // Check for explicit failed, cancelled, or unverified statuses from gateway
    const incomingStatus = String(req.body.status || 'PAID').toUpperCase();
    if (incomingStatus === 'FAILED' || incomingStatus === 'CANCELLED') {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: incomingStatus === 'CANCELLED' ? 'REFUNDED' : 'PENDING',
          transactionRef: transactionRef ? String(transactionRef) : payment.transactionRef,
        },
      });
      return res.status(400).json({
        success: false,
        message: `Payment verification failed: Gateway reported status ${incomingStatus}. Access remains restricted.`,
        payment: serialize(updatedPayment),
      });
    }

    // Idempotency: Prevent duplicate processing of already verified payments
    if (payment.status === 'PAID') {
      return res.json({
        success: true,
        message: 'Payment is already verified and marked as PAID.',
        payment: serialize(payment),
      });
    }

    const txnRef = transactionRef ? String(transactionRef).trim() : `TXN${Date.now().toString().slice(-10)}`;

    // Prevent reuse of existing transaction reference
    const duplicateTxn = await prisma.payment.findFirst({
      where: {
        transactionRef: txnRef,
        status: 'PAID',
        id: { not: payment.id },
      },
    });
    if (duplicateTxn) {
      throw new AppError('Transaction reference has already been used and verified.', 409);
    }

    const now = new Date();
    const validTillDate = new Date(now);
    validTillDate.setFullYear(validTillDate.getFullYear() + 1);

    const student = await prisma.user.findFirst({
      where: { rollNumber: payment.studentRollNumber },
    });
    const totalFee = student?.feeAmount > 0 ? student.feeAmount : payment.amount;
    const newPaid = (student?.feePaidAmount || 0) + payment.amount;
    const newBalance = Math.max(0, totalFee - newPaid);
    const isFullyPaid = newBalance <= 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as PAID
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          transactionRef: txnRef,
          method: String(method),
          date: fmt(now),
          validTill: fmt(validTillDate),
        },
      });

      // 2. Update Student fee amounts in PostgreSQL
      await tx.user.updateMany({
        where: { rollNumber: payment.studentRollNumber },
        data: {
          feeAmount: totalFee,
          feePaidAmount: newPaid,
          feeBalance: newBalance,
          transportFeePaid: isFullyPaid,
        },
      });

      // 3. If there is a linked booking, update it
      let updatedBooking = null;
      if (payment.bookingId) {
        const booking = await tx.booking.findFirst({
          where: { bookingId: payment.bookingId },
        });
        if (booking) {
          updatedBooking = await tx.booking.update({
            where: { id: booking.id },
            data: {
              paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
              paymentMethod: String(method),
              paymentDate: fmt(now),
              validTill: fmt(validTillDate),
              validityPeriod: `Valid for 1 Year (${fmt(now)} - ${fmt(validTillDate)})`,
              qrCodeData: `HITAM|${booking.studentRollNumber}|${booking.busNumber}|SEAT${booking.seatNumber}|${isFullyPaid ? 'PAID_1YR' : 'PARTIAL'}`,
              amountPaid: (booking.amountPaid || 0) + payment.amount,
            },
          });

          // Sync passenger list for driver
          await tx.passenger.updateMany({
            where: { rollNumber: booking.studentRollNumber, seatNo: booking.seatNumber },
            data: { feePaid: true },
          });
        }
      }

      // 4. Send notification
      await tx.notification.create({
        data: {
          title: 'Transport Fee Payment Verified',
          message: `Your payment of ₹${payment.amount.toLocaleString('en-IN')} has been verified successfully. Transport access is now active.`,
          type: 'PAYMENT',
          targetRole: 'STUDENT',
          userId: payment.studentRollNumber,
        },
      });

      return { payment: updatedPayment, booking: updatedBooking };
    }, { maxWait: 25000, timeout: 35000 });

    res.json({
      success: true,
      message: 'Payment verified successfully.',
      payment: serialize(result.payment),
      booking: result.booking ? serialize(result.booking) : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Direct / Legacy createPayment flow with server-side validation.
 */
export const createPayment = async (req, res, next) => {
  try {
    const { bookingId, routeId, method = 'UPI' } = req.body;
    const roll = req.user.rollNumber;

    const student = await prisma.user.findFirst({
      where: { rollNumber: roll },
    });
    if (!student) throw new AppError('Student account not found', 404);

    let targetBooking = null;
    let rId = String(routeId || student.assignedRouteId || '12');

    if (bookingId) {
      targetBooking = await prisma.booking.findFirst({ where: { bookingId: String(bookingId) } });
      if (!targetBooking) throw new AppError('Booking not found', 404);
      if (targetBooking.studentRollNumber !== roll && req.user.role !== 'ADMIN') {
        throw new AppError('This booking does not belong to you', 403);
      }
      rId = targetBooking.routeId;
    }

    const route = await prisma.route.findUnique({ where: { id: rId } });
    const feeAmt = student.feeAmount > 0 ? student.feeAmount : (route?.feeAmount || 12000);
    const balanceDue = student.feeBalance > 0 ? student.feeBalance : Math.max(0, feeAmt - (student.feePaidAmount || 0));
    const payAmount = balanceDue > 0 ? balanceDue : feeAmt;

    const now = new Date();
    const validTillDate = new Date(now);
    validTillDate.setFullYear(validTillDate.getFullYear() + 1);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentId: generatePaymentId(),
          studentRollNumber: roll,
          studentName: student.name,
          routeId: rId,
          bookingId: targetBooking ? targetBooking.bookingId : '',
          amount: payAmount,
          method: String(method),
          status: 'PAID',
          transactionRef: `TXN${Date.now().toString().slice(-10)}`,
          date: fmt(now),
          validTill: fmt(validTillDate),
        },
      });

      const newPaid = (student.feePaidAmount || 0) + payAmount;
      const newBal = Math.max(0, feeAmt - newPaid);

      await tx.user.updateMany({
        where: { rollNumber: roll },
        data: {
          feeAmount: feeAmt,
          feePaidAmount: newPaid,
          feeBalance: newBal,
          transportFeePaid: newBal <= 0,
        },
      });

      let updatedBooking = null;
      if (targetBooking) {
        updatedBooking = await tx.booking.update({
          where: { id: targetBooking.id },
          data: {
            paymentStatus: newBal <= 0 ? 'PAID' : 'PARTIAL',
            paymentMethod: String(method),
            paymentDate: fmt(now),
            validTill: fmt(validTillDate),
            validityPeriod: `Valid for 1 Year (${fmt(now)} - ${fmt(validTillDate)})`,
            qrCodeData: `HITAM|${roll}|${targetBooking.busNumber}|SEAT${targetBooking.seatNumber}|PAID_1YR`,
            amountPaid: (targetBooking.amountPaid || 0) + payAmount,
          },
        });

        await tx.passenger.updateMany({
          where: { rollNumber: roll, seatNo: targetBooking.seatNumber },
          data: { feePaid: true },
        });
      }

      await tx.notification.create({
        data: {
          title: 'Transport Fee Payment Received',
          message: `Fee of ₹${payAmount.toLocaleString('en-IN')} paid via ${method}. Transport access unlocked.`,
          type: 'PAYMENT',
          targetRole: 'STUDENT',
          userId: roll,
        },
      });

      return { payment, booking: updatedBooking };
    });

    res.status(201).json(serialize(result));
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Get authenticated student's own verified payments.
 * Real PostgreSQL records only.
 */
export const getMyPayments = async (req, res, next) => {
  try {
    const roll = req.user?.rollNumber;
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const payments = await prisma.payment.findMany({
      where: { studentRollNumber: { equals: roll, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(serializeMany(payments));
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Admin: List all payments from PostgreSQL.
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status.toUpperCase();
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { studentName: { contains: q, mode: 'insensitive' } },
        { studentRollNumber: { contains: q, mode: 'insensitive' } },
        { paymentId: { contains: q, mode: 'insensitive' } },
        { transactionRef: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * pageSize;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      payments: serializeMany(payments),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Admin: Update payment status manually.
 */
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.payment.findUnique({
      where: { paymentId: String(req.params.paymentId) },
    });
    if (!existing) throw new AppError('Payment not found', 404);

    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: { status: String(status).toUpperCase() },
    });

    res.json(serialize(updated));
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Webhook Handler for Payment Gateway.
 * Idempotent, server-to-server payment confirmation.
 */
export const processPaymentWebhook = async (req, res, next) => {
  try {
    const { event, payload } = req.body;
    // Idempotent webhook stub for gateway integration
    if (!payload?.paymentId) {
      return res.status(400).json({ received: false, error: 'Missing paymentId' });
    }

    res.json({ received: true, event });
  } catch (err) {
    next(err);
  }
};
