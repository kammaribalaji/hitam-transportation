import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';
import { getSeatsForRoute } from './seatController.js';

const num = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

const TRIP_FIELDS = {
  tripId: (v) => String(v),
  routeId: (v) => String(v),
  routeName: (v) => String(v),
  driverRollNumber: (v) => String(v),
  busNumber: (v) => String(v),
  startTime: (v) => String(v),
  endTime: (v) => String(v),
  studentCount: (v) => num(v, 0),
  status: (v) => String(v).toUpperCase(),
  date: (v) => String(v),
  distance: (v) => String(v),
  fuelUsed: (v) => String(v),
  fuelCost: (v) => String(v),
  avgMileage: (v) => String(v),
};

const buildTripData = (body, extra = {}) => {
  const data = { ...extra };
  for (const [key, coerce] of Object.entries(TRIP_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getAllTrips = async (req, res, next) => {
  try {
    const { status, driverRollNumber, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (driverRollNumber) where.driverRollNumber = driverRollNumber;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.trip.count({ where }),
    ]);
    res.json({ trips: serializeMany(trips), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getMyTrips = async (req, res, next) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { driverRollNumber: req.user.rollNumber },
      orderBy: { createdAt: 'desc' },
    });
    res.json(serializeMany(trips));
  } catch (err) {
    next(err);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { tripId: String(req.params.tripId) } });
    if (!trip) throw new AppError('Trip not found', 404);
    res.json(serialize(trip));
  } catch (err) {
    next(err);
  }
};

export const updateTripStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.trip.findUnique({ where: { tripId: String(req.params.tripId) } });
    if (!existing) throw new AppError('Trip not found', 404);
    const trip = await prisma.trip.update({
      where: { id: existing.id },
      data: { status: String(status).toUpperCase() },
    });
    res.json(serialize(trip));
  } catch (err) {
    next(err);
  }
};

export const createTrip = async (req, res, next) => {
  try {
    const trip = await prisma.trip.create({ data: buildTripData(req.body, { tripId: String(req.body.tripId) }) });
    res.status(201).json(serialize(trip));
  } catch (err) {
    next(err);
  }
};

// GET /api/trips/current — today's active/upcoming trip for the logged-in user's route.
export const getCurrentTrip = async (req, res, next) => {
  try {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const where = {
      status: { in: ['UPCOMING', 'IN_PROGRESS'] },
      routeId: req.user.assignedRouteId || '12',
    };
    const trip = await prisma.trip.findFirst({
      where: { OR: [{ date: todayStr }, where] },
      orderBy: { createdAt: 'desc' },
    });
    if (!trip) throw new AppError('No current trip found', 404);
    res.json(serialize(trip));
  } catch (err) {
    next(err);
  }
};

// GET /api/trips/:tripId/seats — availability for the trip's route.
export const getTripSeats = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { tripId: String(req.params.tripId) } });
    if (!trip) throw new AppError('Trip not found', 404);
    const data = await getSeatsForRoute(trip.routeId);
    res.json({ ...data, trip: serialize(trip) });
  } catch (err) {
    next(err);
  }
};
