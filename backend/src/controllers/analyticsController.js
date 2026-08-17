import prisma from '../lib/prisma.js';

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalDrivers,
      totalBuses,
      totalBookings,
      paidBookings,
      totalTrips,
      todayTrips,
      openComplaints,
      routes,
      revenueAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.bus.count(),
      prisma.booking.count({ where: { isActive: true } }),
      prisma.booking.count({ where: { isActive: true, paymentStatus: { contains: 'Paid', mode: 'insensitive' } } }),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: { in: ['UPCOMING', 'IN_PROGRESS'] } } }),
      prisma.complaint.count({ where: { status: 'OPEN' } }),
      prisma.route.findMany({ where: { isActive: true } }),
      // Collected revenue = sum of the actual paid amounts on record (₹42,900
      // per student per the Route 12 sheet; partial payments included).
      prisma.booking.aggregate({
        where: { isActive: true, paymentStatus: { contains: 'Paid', mode: 'insensitive' } },
        _sum: { amountPaid: true },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amountPaid || 0;

    const routeOccupancy = routes.map((r) => ({
      routeId: r.id,
      routeName: r.name,
      totalSeats: r.totalSeats,
      bookedSeats: r.bookedSeats,
      occupancy: r.totalSeats > 0 ? Math.round((r.bookedSeats / r.totalSeats) * 100) : 0,
    }));

    res.json({
      totalStudents,
      totalDrivers,
      totalBuses,
      totalBookings,
      paidBookings,
      totalRevenue,
      totalTrips,
      todayTrips,
      openComplaints,
      routeOccupancy,
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueChart = async (req, res, next) => {
  try {
    // Monthly revenue for the last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        start: d,
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
      });
    }

    const data = await Promise.all(
      months.map(async (m) => {
        const where = {
          isActive: true,
          createdAt: { gte: m.start, lte: m.end },
          paymentStatus: { contains: 'Paid', mode: 'insensitive' },
        };
        const [count, rev] = await Promise.all([
          prisma.booking.count({ where }),
          prisma.booking.aggregate({ where, _sum: { amountPaid: true } }),
        ]);
        return { label: m.label, revenue: rev._sum.amountPaid || 0, bookings: count };
      })
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};
