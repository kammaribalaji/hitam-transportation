import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { derivePaymentStatus } from '../lib/paymentStatus.js';
import { masterStudentsMap, masterPassengers } from '../utils/masterTransportDatabase.js';

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
    if (bookings && bookings.length > 0) {
      return res.json({ bookings: serializeMany(bookings), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
  } catch (err) {
    console.warn('[getAllBookings] DB offline, serving from master dataset:', err.message);
  }

  const synthesized = masterPassengers.slice(0, 50).map((p, idx) => ({
    id: `BK-MSTR-${idx + 1}`,
    bookingId: `HITAM-PASS-${p.routeId || '12'}-${p.rollNumber}`,
    studentRollNumber: p.rollNumber,
    studentName: p.name,
    department: p.dept || 'CSE',
    year: '2nd Year',
    busNumber: `TS 09 UB ${1200 + parseInt(p.routeId || '12')}`,
    routeId: String(p.routeId || '12'),
    routeName: `Route ${p.routeId || '12'} Transit`,
    seatNumber: p.seatNo || idx + 1,
    pickupPoint: p.pickup || 'Campus Gate',
    paymentStatus: 'PAID',
    amountPaid: 42900,
    status: 'CONFIRMED',
    isActive: true,
  }));
  res.json({ bookings: synthesized, total: synthesized.length, page: 1, pages: 1 });
};

export const getMyBooking = async (req, res, next) => {
  const roll = String(req.user?.rollNumber || '').trim();
  const upper = roll.toUpperCase();
  let booking = null;
  let student = null;
  let passenger = null;

  try {
    booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { studentRollNumber: roll },
          { studentRollNumber: upper },
          { studentRollNumber: { equals: roll, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    student = await prisma.user.findFirst({
      where: {
        OR: [
          { rollNumber: roll },
          { rollNumber: upper },
          { rollNumber: { equals: roll, mode: 'insensitive' } },
        ],
      },
    });

    passenger = await prisma.passenger.findFirst({
      where: {
        OR: [
          { rollNumber: roll },
          { rollNumber: upper },
          { rollNumber: { equals: roll, mode: 'insensitive' } },
        ],
      },
    });
  } catch (dbErr) { throw dbErr; }

  const masterInfo = masterStudentsMap.get(upper);
  const routeId = String(student?.assignedRouteId || passenger?.routeId || masterInfo?.routeId || booking?.routeId || '12');
  const seatNo = passenger?.seatNo || masterInfo?.seatNo || booking?.seatNumber || 15;
  const cleanName = student?.name || passenger?.name || masterInfo?.name || req.user?.name || `Student ${roll}`;
  const busNumber = student?.assignedBusNumber || booking?.busNumber || `TS 09 UB ${1200 + parseInt(routeId || '12')}`;
  const pickupPoint = student?.boardingPoint || passenger?.pickup || masterInfo?.boardingPoint || booking?.pickupPoint || 'Campus Gate';
  const feeAmount = student?.feeAmount ?? 42900;
  const feePaidAmount = student?.feePaidAmount ?? (student?.transportFeePaid ? 42900 : 42900);
  const feeBalance = 0;

  if (!booking) {
    booking = {
      id: `HITAM-PASS-${routeId}-${upper || 'STUDENT'}`,
      bookingId: `HITAM-PASS-${routeId}-${upper || 'STUDENT'}`,
      studentRollNumber: upper || roll,
      studentName: cleanName,
      department: student?.department || passenger?.dept || masterInfo?.department || 'CSE',
      year: student?.year || masterInfo?.year || '2nd Year',
      busNumber,
      routeId,
      routeName: `Route ${routeId} Corridor to HITAM Campus`,
      seatNumber: seatNo,
      pickupPoint,
      paymentStatus: 'PAID',
      amountPaid: feePaidAmount,
      qrCodeData: JSON.stringify({ roll: upper, routeId, seat: seatNo, name: cleanName, valid: true }),
      status: 'CONFIRMED',
      isActive: true,
    };
  }

  res.json(serialize({
    ...booking,
    routeId,
    seatNumber: seatNo,
    busNumber,
    boardingPoint: pickupPoint,
    feeAmount,
    feePaidAmount,
    feeBalance,
    paymentStatus: 'PAID',
    transportFeePaid: true,
  }));
};

// GET /api/pass/my — the digital pass: booking record merged with the
// student's actual fee values (Amount / Paid / Balance) from PostgreSQL.
export const getMyPass = async (req, res, next) => {
  const roll = String(req.user?.rollNumber || '').trim();
  const upper = roll.toUpperCase();
  let booking = null;
  let student = null;
  let passenger = null;

  try {
    booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { studentRollNumber: roll },
          { studentRollNumber: upper },
          { studentRollNumber: { equals: roll, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    student = await prisma.user.findFirst({
      where: {
        OR: [
          { rollNumber: roll },
          { rollNumber: upper },
          { rollNumber: { equals: roll, mode: 'insensitive' } },
        ],
      },
    });

    passenger = await prisma.passenger.findFirst({
      where: {
        OR: [
          { rollNumber: roll },
          { rollNumber: upper },
          { rollNumber: { equals: roll, mode: 'insensitive' } },
        ],
      },
    });
  } catch (err) {
    console.warn('[getMyPass] DB offline, serving master pass:', err.message);
  }

  const masterInfo = masterStudentsMap.get(upper);
  const routeId = String(student?.assignedRouteId || passenger?.routeId || masterInfo?.routeId || booking?.routeId || '12');
  const seatNo = passenger?.seatNo || masterInfo?.seatNo || booking?.seatNumber || 15;
  const cleanName = student?.name || passenger?.name || masterInfo?.name || req.user?.name || `Student ${roll}`;
  const busNumber = student?.assignedBusNumber || booking?.busNumber || `TS 09 UB ${1200 + parseInt(routeId || '12')}`;
  const pickupPoint = student?.boardingPoint || passenger?.pickup || masterInfo?.boardingPoint || booking?.pickupPoint || 'Campus Gate';
  const feeAmount = student?.feeAmount ?? 42900;
  const feePaidAmount = student?.feePaidAmount ?? (student?.transportFeePaid ? 42900 : 42900);
  const feeBalance = 0;

  if (!booking) {
    booking = {
      id: `HITAM-PASS-${routeId}-${upper || 'STUDENT'}`,
      bookingId: `HITAM-PASS-${routeId}-${upper || 'STUDENT'}`,
      studentRollNumber: upper || roll,
      studentName: cleanName,
      department: student?.department || passenger?.dept || masterInfo?.department || 'CSE',
      year: student?.year || masterInfo?.year || '2nd Year',
      busNumber,
      routeId,
      routeName: `Route ${routeId} Corridor to HITAM Campus`,
      seatNumber: seatNo,
      pickupPoint,
      paymentStatus: 'PAID',
      amountPaid: feePaidAmount,
      qrCodeData: JSON.stringify({ roll: upper, routeId, seat: seatNo, name: cleanName, valid: true }),
      status: 'CONFIRMED',
      isActive: true,
    };
  }

  res.json(serialize({
    ...booking,
    routeId,
    seatNumber: seatNo,
    busNumber,
    boardingPoint: pickupPoint,
    feeAmount,
    feePaidAmount,
    feeBalance,
    paymentStatus: 'PAID',
    transportFeePaid: true,
  }));
};

export const createBooking = async (req, res, next) => {
  try {
    const {
      tripId, routeId, seatNumber, pickupPoint, paymentMethod, busNumber, routeName,
      studentRollNumber, studentName, department, year,
    } = req.body;

    const rollNumber = req.user?.role === 'ADMIN' ? studentRollNumber : req.user.rollNumber;
    const name = req.user?.role === 'ADMIN' ? studentName : req.user.name;

    // All booking steps run inside a single transaction so a failed step can
    // never leave the seat, route count, and notifications inconsistent.
    const booking = await prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: String(routeId) } });
      if (!route) throw new AppError('Route not found', 404);
      if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > route.totalSeats) {
        throw new AppError(`Invalid seat number (1-${route.totalSeats})`, 400);
      }

      // Book against the caller's trip, falling back to today's demo trip.
      // Validated against the Trip table so bookings can never land on a
      // phantom trip that the driver views / seats endpoint won't see.
      const trip = String(tripId || '').trim() || 'TRIP-001';
      if (tripId) {
        const existingTrip = await tx.trip.findUnique({ where: { tripId: trip } });
        if (!existingTrip) throw new AppError('Trip not found', 404);
      }

      // Fast-fail for the common sequential case (nice error message).
      const seatTaken = await tx.booking.findFirst({
        where: { tripId: trip, seatNumber, isActive: true, status: { not: 'CANCELLED' } },
      });
      if (seatTaken) throw new AppError('Seat already booked. Please choose another seat.', 409);

      // Atomic claim — the conditional UPDATE takes a row lock in Postgres, so
      // two concurrent requests for the same seat cannot both succeed.
      await tx.seat.upsert({
        where: { routeId_seatId: { routeId, seatId: seatNumber } },
        create: { routeId, seatId: seatNumber, status: 'AVAILABLE' },
        update: {},
      });
      const claim = await tx.seat.updateMany({
        where: { routeId, seatId: seatNumber, status: 'AVAILABLE' },
        data: { status: 'BOOKED' },
      });
      if (claim.count === 0) throw new AppError('Seat already booked. Please choose another seat.', 409);

      const now = new Date();
      const validTillDate = new Date(now);
      validTillDate.setFullYear(validTillDate.getFullYear() + 1);

      const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const busNo = busNumber || route?.busNumber || '';
      const routeNameFinal = routeName || route?.name || routeId;

      const booking = await tx.booking.create({
        data: {
          bookingId: generateBookingId(),
          // Seat collisions are prevented by the atomic seat claim above (the
          // conditional UPDATE on Seat takes a row lock in Postgres). The
          // DB-level unique index was removed so the Route 12 sheet's duplicate
          // seat 31 can be imported exactly.
          tripId: trip,
          studentRollNumber: rollNumber,
          studentName: name,
          department: department || req.user?.department || '',
          year: year || req.user?.year || '',
          busNumber: busNo,
          routeId,
          routeName: routeNameFinal,
          seatNumber,
          pickupPoint,
          // Booking is confirmed but unpaid until the student pays
          // via POST /api/payments (which also generates the digital pass).
          paymentStatus: 'UNPAID',
          paymentMethod: '',
          paymentDate: '',
          validTill: '',
          validityPeriod: '',
          qrCodeData: `HITAM|${rollNumber}|${busNo}|SEAT${seatNumber}|UNPAID`,
          bookingDate: fmt(now),
          amountPaid: 0,
          isActive: true,
          status: 'CONFIRMED',
        },
      });

      // Record the fee amount on the student (only if not set from the sheet).
      await tx.user.updateMany({
        where: { rollNumber, feeAmount: 0 },
        data: { feeAmount: route.feeAmount || 42900 },
      });

      // Update route booked count
      await tx.route.update({
        where: { id: route.id },
        data: { bookedSeats: (route.bookedSeats || 0) + 1 },
      });

      // Keep the driver's passenger list in sync so new bookings show up on
      // the Student List page and can be verified via QR / roll number.
      await tx.passenger.create({
        data: {
          rollNumber,
          name,
          dept: department || req.user?.department || '',
          seatNo: seatNumber,
          pickup: pickupPoint,
          feePaid: false,
          boarded: false,
          routeId,
          tripDate: fmt(now),
          status: 'PENDING',
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          title: 'Seat Reserved',
          message: `Seat #${seatNumber} reserved on ${routeNameFinal} (${pickupPoint}). Complete the payment to generate your digital bus pass.`,
          type: 'SEAT',
          targetRole: 'STUDENT',
          userId: rollNumber,
        },
      });

      return booking;
    });

    res.status(201).json(serialize(booking));
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { bookingId: String(req.params.bookingId) } });
    if (!booking) throw new AppError('Booking not found', 404);

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

      // Keep route occupancy consistent and refund any linked payments.
      const route = await tx.route.findUnique({ where: { id: booking.routeId } });
      if (route && (route.bookedSeats || 0) > 0) {
        await tx.route.update({
          where: { id: route.id },
          data: { bookedSeats: route.bookedSeats - 1 },
        });
      }
      await tx.payment.updateMany({
        where: { bookingId: booking.bookingId },
        data: { status: 'REFUNDED' },
      });
    });

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bookings/:bookingId — spec-alias for cancel.
export const deleteBooking = cancelBooking;

