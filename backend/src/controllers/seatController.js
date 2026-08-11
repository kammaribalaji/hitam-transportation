import Seat from '../models/Seat.js';
import Booking from '../models/Booking.js';
import Route from '../models/Route.js';

export const getSeatsByRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const route = await Route.findOne({ id: routeId });
    const totalSeats = route?.totalSeats || 40;

    // Get booked seats from DB
    const bookedSeats = await Booking.find({ routeId, isActive: true, status: { $ne: 'CANCELLED' } }).select('seatNumber');
    const bookedSeatNums = new Set(bookedSeats.map((b) => b.seatNumber));

    // Reserved seats (driver, front-row reserved)
    const reservedSeats = new Set([3, 4]);

    const seats = Array.from({ length: totalSeats }, (_, i) => {
      const id = i + 1;
      let status = 'AVAILABLE';
      if (bookedSeatNums.has(id)) status = 'BOOKED';
      else if (reservedSeats.has(id)) status = 'RESERVED';
      return { id, status, label: id.toString() };
    });

    res.json(seats);
  } catch (err) {
    next(err);
  }
};
