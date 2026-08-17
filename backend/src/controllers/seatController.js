import prisma from '../lib/prisma.js';

/**
 * Seat availability is ALWAYS derived from live bookings in PostgreSQL —
 * nothing is hardcoded. Reserved/blocked seats are not used so that the
 * seeded state (42 booked / 8 available for Route 12) stays exact.
 */
export const getSeatsForRoute = async (routeId) => {
  const rid = String(routeId);
  const route = await prisma.route.findUnique({ where: { id: rid } });
  const totalSeats = route?.totalSeats || 50;

  const bookedSeats = await prisma.booking.findMany({
    where: { routeId: rid, isActive: true, status: { not: 'CANCELLED' } },
    select: { seatNumber: true, studentRollNumber: true },
  });

  // Only physical seats (1..totalSeats) count towards occupancy — waitlisted
  // passengers are stored with seatNumber 0 (no physical seat).
  const bookedMap = new Map(
    bookedSeats
      .filter((b) => b.seatNumber >= 1 && b.seatNumber <= totalSeats)
      .map((b) => [b.seatNumber, b.studentRollNumber])
  );

  return {
    routeId: rid,
    totalSeats,
    bookedCount: bookedMap.size,
    availableCount: totalSeats - bookedMap.size,
    seats: Array.from({ length: totalSeats }, (_, i) => {
      const id = i + 1;
      const holder = bookedMap.get(id);
      return {
        id,
        label: String(id),
        status: holder ? 'BOOKED' : 'AVAILABLE',
        studentRollNumber: holder || null,
      };
    }),
  };
};

export const getSeatsByRoute = async (req, res, next) => {
  try {
    const data = await getSeatsForRoute(req.params.routeId);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
