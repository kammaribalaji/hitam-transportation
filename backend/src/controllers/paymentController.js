import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { derivePaymentStatus } from '../lib/paymentStatus.js';

const generatePaymentId = () => `PAY-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Student pays for an existing booking. Creates the Payment record, flips the
 * booking to "Paid", enables the digital pass (QR), and notifies the student.
 * Every step runs in one transaction so nothing can be left half-done.
 */
export const createPayment = async (req, res, next) => {
  try {
    const { bookingId, method = 'UPI', amount } = req.body;
    if (!bookingId) throw new AppError('bookingId is required', 400);

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { bookingId: String(bookingId) } });
      if (!booking) throw new AppError('Booking not found', 404);
      if (booking.studentRollNumber !== req.user.rollNumber && req.user.role !== 'ADMIN') {
        throw new AppError('This booking does not belong to you', 403);
      }

      // Block only FULLY-paid bookings. A naive substring check like
      // `status.includes('paid')` also matches "UNPAID"/"Partially Paid" and
      // wrongly rejects fresh bookings, so compare the derived status instead.
      const route = await tx.route.findUnique({ where: { id: booking.routeId } });
      const bookingFeeAmount = route?.feeAmount || booking.amountPaid || 0;
      if (derivePaymentStatus(bookingFeeAmount, booking.amountPaid || 0) === 'PAID') {
        throw new AppError('This booking is already paid', 400);
      }

      const payAmount = Number(amount) || route?.feeAmount || booking.amountPaid || 12000;
      const now = new Date();
      const validTillDate = new Date(now);
      validTillDate.setFullYear(validTillDate.getFullYear() + 1);

      const payment = await tx.payment.create({
        data: {
          paymentId: generatePaymentId(),
          studentRollNumber: booking.studentRollNumber,
          studentName: booking.studentName,
          routeId: booking.routeId,
          bookingId: booking.bookingId,
          amount: payAmount,
          method: String(method),
          status: 'PAID',
          transactionRef: `TXN${Date.now().toString().slice(-10)}`,
          date: fmt(now),
          validTill: fmt(validTillDate),
        },
      });

      // Update the student's actual fee values (Amount / Paid / Balance).
      const student = await tx.user.findFirst({ where: { rollNumber: booking.studentRollNumber } });
      const feeAmount = student?.feeAmount || payAmount;
      const feePaidAmount = (student?.feePaidAmount || 0) + payAmount;
      const feeBalance = Math.max(0, feeAmount - feePaidAmount);
      const derived = derivePaymentStatus(feeAmount, feePaidAmount);

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: derived,
          paymentMethod: String(method),
          paymentDate: fmt(now),
          validTill: fmt(validTillDate),
          validityPeriod: `Valid for 1 Year (${fmt(now)} - ${fmt(validTillDate)})`,
          qrCodeData: `HITAM|${booking.studentRollNumber}|${booking.busNumber}|SEAT${booking.seatNumber}|${derived === 'PAID' ? 'PAID_1YR' : 'PARTIAL'}`,
          amountPaid: (booking.amountPaid || 0) + payAmount,
        },
      });

      await tx.user.updateMany({
        where: { rollNumber: booking.studentRollNumber },
        data: {
          feeAmount,
          feePaidAmount,
          feeBalance,
          transportFeePaid: derived === 'PAID',
        },
      });

      // Keep the driver's passenger list fee flag in sync.
      await tx.passenger.updateMany({
        where: { rollNumber: booking.studentRollNumber, seatNo: booking.seatNumber },
        data: { feePaid: true },
      });

      await tx.notification.create({
        data: {
          title: 'Annual Payment Successful',
          message: `Seat #${booking.seatNumber} & Annual Pass confirmed for ${booking.routeName} (${booking.pickupPoint}). Fee: ₹${payAmount.toLocaleString('en-IN')} paid via ${method}.`,
          type: 'PAYMENT',
          targetRole: 'STUDENT',
          userId: booking.studentRollNumber,
        },
      });

      return { payment, booking: updatedBooking };
    });

    res.status(201).json(serialize(result));
  } catch (err) {
    next(err);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { studentRollNumber: req.user.rollNumber },
      orderBy: { createdAt: 'desc' },
    });
    res.json(serializeMany(payments));
  } catch (err) {
    next(err);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentRollNumber: { contains: search, mode: 'insensitive' } },
        { paymentId: { contains: search, mode: 'insensitive' } },
        { transactionRef: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments: serializeMany(payments), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.payment.findUnique({ where: { paymentId: String(req.params.paymentId) } });
    if (!existing) throw new AppError('Payment not found', 404);

    const payment = await prisma.payment.update({
      where: { id: existing.id },
      data: { status: String(status).toUpperCase() },
    });
    res.json(serialize(payment));
  } catch (err) {
    next(err);
  }
};
