import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import Complaint from '../models/Complaint.js';
import Route from '../models/Route.js';

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
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: 'DRIVER' }),
      Bus.countDocuments(),
      Booking.countDocuments({ isActive: true }),
      Booking.countDocuments({ isActive: true, paymentStatus: { $regex: 'Paid', $options: 'i' } }),
      Trip.countDocuments(),
      Trip.countDocuments({ status: { $in: ['UPCOMING', 'IN_PROGRESS'] } }),
      Complaint.countDocuments({ status: 'OPEN' }),
      Route.find({ isActive: true }),
    ]);

    const totalRevenue = paidBookings * 12000;

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
        const count = await Booking.countDocuments({
          isActive: true,
          createdAt: { $gte: m.start, $lte: m.end },
          paymentStatus: { $regex: 'Paid', $options: 'i' },
        });
        return { label: m.label, revenue: count * 12000, bookings: count };
      })
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
};
