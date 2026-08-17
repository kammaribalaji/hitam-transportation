import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize } from '../lib/serialize.js';
import {
  isHypegpsEnabled,
  getDeviceIdForRoute,
  getDeviceLocation,
  getLastKnownLocation,
  HypeGpsError,
} from '../services/hypegpsService.js';

const isValidLat = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
const isValidLng = (n) => Number.isFinite(n) && n >= -180 && n <= 180;

// Map provider-level failures to HTTP errors. Device-not-found is a 404
// (config mismatch — the admin should notice); everything else is a 503
// (transient provider problem the frontend can treat as "tracker unavailable").
const toAppError = (err) => {
  if (err instanceof HypeGpsError) {
    return new AppError(err.message, err.code === 'DEVICE_NOT_FOUND' ? 404 : 503);
  }
  return err;
};

/**
 * Serve a route's live position from HypeGPS when the route is mapped to a
 * device (and HypeGPS is configured). Returns the normalized payload, or null
 * when HypeGPS is disabled / the route is unmapped — in which case callers
 * fall back to the legacy BusLocation lookup so existing behavior is unchanged.
 */
export const getRouteHypegpsPayload = async (routeId) => {
  const deviceId = await getDeviceIdForRoute(routeId);
  if (!deviceId) return null; // unmapped route -> legacy BusLocation path

  // Mapped route but provider not configured: NEVER fall back to legacy/
  // simulated rows. Return a clear error explaining the actual problem.
  if (!isHypegpsEnabled()) {
    throw new AppError(
      'Live tracking unavailable: HypeGPS is not configured. Set HYPEGPS_API_URL and HYPEGPS_API_HASH on the backend.',
      503
    );
  }

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw new AppError('Route not found', 404);

  let gps = null;
  try {
    gps = await getDeviceLocation(deviceId);
  } catch (err) {
    // Provider unreachable / device temporarily without a fix: fall back to the
    // last known GOOD HypeGPS snapshot, clearly marked stale. Never simulation.
    if (err instanceof HypeGpsError && err.code !== 'DEVICE_NOT_FOUND') {
      const last = getLastKnownLocation(deviceId);
      if (last) gps = { ...last, isStale: true };
    }
    if (!gps) throw toAppError(err);
  }

  return {
    ...gps,
    _id: deviceId,
    route: routeId, // alias for consumers expecting "route"
    routeId,
    busNumber: route.busNumber || '',
  };
};

export const upsertMyLiveLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, speed = 0, heading = null, routeId, busNumber, source = 'GPS' } = req.body;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const spd = Number(speed);

    if (!isValidLat(lat) || !isValidLng(lng)) {
      throw new AppError('Valid latitude and longitude are required', 400);
    }

    const liveRouteId = routeId || req.user.assignedRouteId;
    if (!liveRouteId) throw new AppError('Route id is required', 400);

    const doc = await prisma.busLocation.upsert({
      where: { driverRollNumber: req.user.rollNumber },
      create: {
        driverRollNumber: req.user.rollNumber,
        routeId: liveRouteId,
        busNumber: busNumber || req.user.assignedBusNumber || '',
        latitude: lat,
        longitude: lng,
        speed: Number.isFinite(spd) ? spd : 0,
        heading: heading == null ? null : Number(heading),
        source: source === 'SIMULATED' ? 'SIMULATED' : 'GPS',
        lastPingAt: new Date(),
      },
      update: {
        routeId: liveRouteId,
        busNumber: busNumber || req.user.assignedBusNumber || '',
        latitude: lat,
        longitude: lng,
        speed: Number.isFinite(spd) ? spd : 0,
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

export const getLiveLocationByRoute = async (req, res, next) => {
  try {
    const routeId = String(req.params.routeId);

    const gps = await getRouteHypegpsPayload(routeId);
    if (gps) return res.json(gps);

    // Legacy fallback for unmapped routes (or when HypeGPS is not configured).
    const doc = await prisma.busLocation.findFirst({
      where: { routeId },
      orderBy: { lastPingAt: 'desc' },
    });
    if (!doc) throw new AppError('Live location not found for route', 404);
    res.json(serialize(doc));
  } catch (err) {
    next(err);
  }
};

export const getLiveLocationByBus = async (req, res, next) => {
  try {
    const busNumber = String(req.params.busNumber);

    const bus = await prisma.bus.findUnique({ where: { busNumber } });
    if (bus?.routeId) {
      const gps = await getRouteHypegpsPayload(bus.routeId);
      if (gps) return res.json(gps);
    }

    const doc = await prisma.busLocation.findFirst({
      where: { busNumber },
      orderBy: { lastPingAt: 'desc' },
    });
    if (!doc) throw new AppError('Live location not found for bus', 404);
    res.json(serialize(doc));
  } catch (err) {
    next(err);
  }
};
