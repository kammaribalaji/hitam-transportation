import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { derivePaymentStatus } from '../lib/paymentStatus.js';

const generateBookingId = () => `HITAM-PASS-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

export const getAllBookings = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentRollNumber: { contains: search, mode: 'insensitive' } },
        { busNumber: { contains: search, mode: 'insensitive' } },
        { routeName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.booking.count({ where }),
    ]);

    return res.json({
      bookings: serializeMany(bookings),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get currently authenticated student's active booking.
 * Strictly uses PostgreSQL without synthetic fake pass generation.
 */
export const getMyBooking = async (req, res, next) => {
  try {
    const roll = String(req.user?.rollNumber || '').trim().toUpperCase();
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const [booking, student] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          studentRollNumber: { equals: roll, mode: 'insensitive' },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findFirst({
        where: { rollNumber: { equals: roll, mode: 'insensitive' } },
      }),
    ]);

    if (!booking) {
      // No active booking found in PostgreSQL
      return res.json(null);
    }

    const feeAmount = student?.feeAmount || 0;
    const feePaidAmount = student?.feePaidAmount || 0;
    const feeBalance = student?.feeBalance ?? Math.max(0, feeAmount - feePaidAmount);
    const transportFeePaid = student?.transportFeePaid || false;

    res.json(
      serialize({
        ...booking,
        feeAmount,
        feePaidAmount,
        feeBalance,
        transportFeePaid,
      })
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/pass/my — the digital pass.
 * Strictly gated behind verified transport fee payment.
 */
export const getMyPass = async (req, res, next) => {
  try {
    const roll = String(req.user?.rollNumber || '').trim().toUpperCase();
    if (!roll) throw new AppError('Unauthenticated session', 401);

    const [student, booking] = await Promise.all([
      prisma.user.findFirst({
        where: { rollNumber: { equals: roll, mode: 'insensitive' } },
      }),
      prisma.booking.findFirst({
        where: {
          studentRollNumber: { equals: roll, mode: 'insensitive' },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Gate: Unpaid students cannot access active digital pass
    const isFeePaid = Boolean(student.transportFeePaid || booking?.paymentStatus === 'PAID');
    if (!isFeePaid) {
      return res.status(403).json({
        message: 'Your transport fee is pending. Complete the required payment to access your digital bus pass.',
        transportFeePaid: false,
        feeAmount: student.feeAmount,
        feeBalance: student.feeBalance,
      });
    }

    if (!booking) {
      return res.status(404).json({
        message: 'No active bus pass found. Please reserve a seat to generate your digital pass.',
        transportFeePaid: true,
      });
    }

    res.json(
      serialize({
        ...booking,
        feeAmount: student.feeAmount,
        feePaidAmount: student.feePaidAmount,
        feeBalance: student.feeBalance,
        transportFeePaid: true,
      })
    );
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const {
      tripId,
      routeId,
      seatNumber,
      pickupPoint,
      paymentMethod,
      busNumber,
      routeName,
      studentRollNumber,
      studentName,
      department,
      year,
    } = req.body;

    const rollNumber = req.user?.role === 'ADMIN' ? (studentRollNumber || req.user.rollNumber) : req.user.rollNumber;
    const name = req.user?.role === 'ADMIN' ? (studentName || req.user.name) : req.user.name;

    const booking = await prisma.$transaction(async (tx) => {
      const student = await tx.user.findFirst({ where: { rollNumber } });
      if (!student) throw new AppError('Student account not found', 404);

      const route = await tx.route.findUnique({ where: { id: String(routeId) } });
      if (!route) throw new AppError('Route not found', 404);
      if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > route.totalSeats) {
        throw new AppError(`Invalid seat number (1-${route.totalSeats})`, 400);
      }

      const trip = String(tripId || '').trim() || 'TRIP-001';
      if (tripId) {
        const existingTrip = await tx.trip.findUnique({ where: { tripId: trip } });
        if (!existingTrip) throw new AppError('Trip not found', 404);
      }

      const seatTaken = await tx.booking.findFirst({
        where: { tripId: trip, seatNumber, isActive: true, status: { not: 'CANCELLED' } },
      });
      if (seatTaken) throw new AppError('Seat already booked. Please choose another seat.', 409);

      await tx.seat.upsert({
        where: { routeId_seatId: { routeId: String(routeId), seatId: seatNumber } },
        create: { routeId: String(routeId), seatId: seatNumber, status: 'AVAILABLE' },
        update: {},
      });
      const claim = await tx.seat.updateMany({
        where: { routeId: String(routeId), seatId: seatNumber, status: 'AVAILABLE' },
        data: { status: 'BOOKED' },
      });
      if (claim.count === 0) throw new AppError('Seat already booked. Please choose another seat.', 409);

      const now = new Date();
      const validTillDate = new Date(now);
      validTillDate.setFullYear(validTillDate.getFullYear() + 1);

      const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const busNo = busNumber || route?.busNumber || '';
      const routeNameFinal = routeName || route?.name || routeId;
      const isPaid = Boolean(student.transportFeePaid);

      const newBooking = await tx.booking.create({
        data: {
          bookingId: generateBookingId(),
          tripId: trip,
          studentRollNumber: rollNumber,
          studentName: name,
          department: department || student.department || '',
          year: year || student.year || '',
          busNumber: busNo,
          routeId: String(routeId),
          routeName: routeNameFinal,
          seatNumber,
          pickupPoint: pickupPoint || student.boardingPoint || route.pickupPoint,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
          paymentMethod: isPaid ? (paymentMethod || 'Online') : '',
          paymentDate: isPaid ? fmt(now) : '',
          validTill: isPaid ? fmt(validTillDate) : '',
          validityPeriod: isPaid ? `Valid for 1 Year (${fmt(now)} - ${fmt(validTillDate)})` : '',
          qrCodeData: `HITAM|${rollNumber}|${busNo}|SEAT${seatNumber}|${isPaid ? 'PAID_1YR' : 'UNPAID'}`,
          bookingDate: fmt(now),
          amountPaid: isPaid ? route.feeAmount : 0,
          isActive: true,
          status: 'CONFIRMED',
        },
      });

      // Update route booked seats count
      await tx.route.update({
        where: { id: route.id },
        data: { bookedSeats: (route.bookedSeats || 0) + 1 },
      });

      // Keep passenger record in sync
      await tx.passenger.create({
        data: {
          rollNumber,
          name,
          dept: department || student.department || '',
          seatNo: seatNumber,
          pickup: pickupPoint || student.boardingPoint || '',
          feePaid: isPaid,
          boarded: false,
          routeId: String(routeId),
          tripDate: fmt(now),
          status: 'PENDING',
        },
      });

      return newBooking;
    }, { timeout: 20000, maxWait: 10000 });

    res.status(201).json(serialize(booking));
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { bookingId: String(req.params.bookingId) } });
    if (!booking) throw new AppError('Booking not found', 404);

    // Ownership check
    if (req.user?.role === 'STUDENT' && booking.studentRollNumber !== req.user.rollNumber) {
      throw new AppError('Access denied. You can only cancel your own booking.', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', isActive: false },
      });

      // Free the seat
      await tx.seat.updateMany({
        where: { routeId: booking.routeId, seatId: booking.seatNumber },
        data: { status: 'AVAILABLE' },
      });

      const route = await tx.route.findUnique({ where: { id: booking.routeId } });
      if (route && (route.bookedSeats || 0) > 0) {
        await tx.route.update({
          where: { id: route.id },
          data: { bookedSeats: route.bookedSeats - 1 },
        });
      }
    });

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteBooking = cancelBooking;
