import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize } from '../lib/serialize.js';
import { getRouteHypegpsPayload } from './liveLocationController.js';

/**
 * Trip-scoped live tracking.
 *   GET  /api/tracking/:tripId        -> latest location for the trip's route
 *                                        (HypeGPS when the route is mapped,
 *                                        otherwise the latest BusLocation)
 *   POST /api/tracking/:tripId/location -> driver pushes a new location for the trip
 */
export const getTrackingByTrip = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { tripId: String(req.params.tripId) } });
    if (!trip) throw new AppError('Trip not found', 404);

    // HypeGPS first when the trip's route is mapped to a tracker device.
    const gps = await getRouteHypegpsPayload(trip.routeId);
    if (gps) return res.json({ ...gps, trip });

    // Legacy fallback for unmapped routes (or when HypeGPS is not configured).
    const doc = await prisma.busLocation.findFirst({
      where: { routeId: trip.routeId },
      orderBy: { lastPingAt: 'desc' },
    });
    if (!doc) throw new AppError('No live location available for this trip yet', 404);

    res.json(serialize({ ...doc, trip }));
  } catch (err) {
    next(err);
  }
};

export const postTrackingLocation = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { tripId: String(req.params.tripId) } });
    if (!trip) throw new AppError('Trip not found', 404);

    const { latitude, longitude, speed = 0, heading = null, source = 'GPS' } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new AppError('Valid latitude and longitude are required', 400);
    }

    const doc = await prisma.busLocation.upsert({
      where: { driverRollNumber: req.user.rollNumber },
      create: {
        driverRollNumber: req.user.rollNumber,
        routeId: trip.routeId,
        busNumber: trip.busNumber || req.user.assignedBusNumber || '',
        latitude: lat,
        longitude: lng,
        speed: Number.isFinite(Number(speed)) ? Number(speed) : 0,
        heading: heading == null ? null : Number(heading),
        source: source === 'SIMULATED' ? 'SIMULATED' : 'GPS',
        lastPingAt: new Date(),
      },
      update: {
        routeId: trip.routeId,
        busNumber: trip.busNumber || req.user.assignedBusNumber || '',
        latitude: lat,
        longitude: lng,
        speed: Number.isFinite(Number(speed)) ? Number(speed) : 0,
        heading: heading == null ? null : Number(heading),
        source: source === 'SIMULATED' ? 'SIMULATED' : 'GPS',
        lastPingAt: new Date(),
      },
    });

    res.json(serialize(doc));
  } catch (err) {
    next(err);
  }
};
