import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import Route from '../models/Route.js';
import Notification from '../models/Notification.js';
import { AppError } from '../middlewares/errorHandler.js';

const generateBookingId = () => `HITAM-PASS-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

export const getAllBookings = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentRollNumber: { $regex: search, $options: 'i' } },
        { busNumber: { $regex: search, $options: 'i' } },
        { routeName: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Booking.countDocuments(filter),
    ]);
    res.json({ bookings, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getMyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ studentRollNumber: req.user.rollNumber, isActive: true }).sort({ createdAt: -1 });
    if (!booking) return res.json(null);
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const {
      routeId, seatNumber, pickupPoint, paymentMethod, busNumber, routeName,
      studentRollNumber, studentName, department, year
    } = req.body;

    const rollNumber = req.user?.role === 'ADMIN' ? studentRollNumber : req.user.rollNumber;
    const name = req.user?.role === 'ADMIN' ? studentName : req.user.name;

    // Check seat availability
    const seatTaken = await Booking.findOne({ routeId, seatNumber, isActive: true, status: { $ne: 'CANCELLED' } });
    if (seatTaken) throw new AppError('Seat already booked', 400);

    const route = await Route.findOne({ id: routeId });
    const now = new Date();
    const validTillDate = new Date(now);
    validTillDate.setFullYear(validTillDate.getFullYear() + 1);

    const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const booking = await Booking.create({
      bookingId: generateBookingId(),
      studentRollNumber: rollNumber,
      studentName: name,
      department: department || req.user?.department || '',
      year: year || req.user?.year || '',
      busNumber: busNumber || route?.busNumber || '',
      routeId,
      routeName: routeName || route?.name || routeId,
      seatNumber,
      pickupPoint,
      paymentStatus: 'Paid (Annual Pass)',
      paymentMethod: paymentMethod || 'UPI',
      paymentDate: fmt(now),
      validTill: fmt(validTillDate),
      validityPeriod: `Valid for 1 Year (${fmt(now)} - ${fmt(validTillDate)})`,
      qrCodeData: `HITAM|${rollNumber}|${busNumber || route?.busNumber}|SEAT${seatNumber}|PAID_1YR`,
      bookingDate: fmt(now),
      amountPaid: route?.feeAmount || 12000,
      isActive: true,
      status: 'CONFIRMED',
    });

    // Mark seat booked
    await Seat.findOneAndUpdate(
      { routeId, seatId: seatNumber },
      { status: 'BOOKED' },
      { upsert: true }
    );

    // Update route booked count
    if (route) {
      route.bookedSeats = (route.bookedSeats || 0) + 1;
      await route.save();
    }

    // Create notification
    await Notification.create({
      title: 'Annual Payment Successful',
      message: `Seat #${seatNumber} & Annual Pass confirmed for ${routeName || routeId} (${pickupPoint}). Fee: ₹${route?.feeAmount || 12000} paid via ${paymentMethod || 'UPI'}.`,
      type: 'PAYMENT',
      targetRole: 'STUDENT',
      userId: rollNumber,
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId });
    if (!booking) throw new AppError('Booking not found', 404);

    booking.status = 'CANCELLED';
    booking.isActive = false;
    await booking.save();

    // Free the seat
    await Seat.findOneAndUpdate(
      { routeId: booking.routeId, seatId: booking.seatNumber },
      { status: 'AVAILABLE' }
    );

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
};
