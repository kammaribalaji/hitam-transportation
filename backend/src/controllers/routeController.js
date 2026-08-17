import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const num = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

const ROUTE_FIELDS = {
  name: (v) => String(v),
  busNumber: (v) => String(v),
  pickupPoint: (v) => String(v),
  reportingTime: (v) => String(v),
  feeAmount: (v) => num(v, 12000),
  totalSeats: (v) => num(v, 40),
  bookedSeats: (v) => num(v, 0),
  stops: (v) => (Array.isArray(v) ? v.map(String) : []),
  startPoint: (v) => String(v),
  endPoint: (v) => String(v),
  distance: (v) => String(v),
  isActive: (v) => Boolean(v),
};

const buildRouteData = (body, extra = {}) => {
  const data = { ...extra };
  for (const [key, coerce] of Object.entries(ROUTE_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getAllRoutes = async (req, res, next) => {
  try {
    const routes = await prisma.route.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
    res.json(serializeMany(routes));
  } catch (err) {
    next(err);
  }
};

export const getRouteById = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({ where: { id: String(req.params.id) } });
    if (!route) throw new AppError('Route not found', 404);
    res.json(serialize(route));
  } catch (err) {
    next(err);
  }
};

export const createRoute = async (req, res, next) => {
  try {
    const id = String(req.body.id || '').trim();
    if (!id) throw new AppError('Route ID is required', 400);
    const exists = await prisma.route.findUnique({ where: { id } });
    if (exists) throw new AppError('Route ID already exists', 409);
    const route = await prisma.route.create({ data: buildRouteData(req.body, { id }) });
    res.status(201).json(serialize(route));
  } catch (err) {
    next(err);
  }
};

export const updateRoute = async (req, res, next) => {
  try {
    const existing = await prisma.route.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Route not found', 404);
    const route = await prisma.route.update({ where: { id: existing.id }, data: buildRouteData(req.body) });
    res.json(serialize(route));
  } catch (err) {
    next(err);
  }
};

export const deleteRoute = async (req, res, next) => {
  try {
    const existing = await prisma.route.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Route not found', 404);
    const route = await prisma.route.update({ where: { id: existing.id }, data: { isActive: false } });
    res.json({ message: 'Route deactivated' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Route stops (real lat/lng + schedule, used by the Leaflet tracking maps)
// ---------------------------------------------------------------------------

export const getRouteStops = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({ where: { id: String(req.params.id) } });
    if (!route) throw new AppError('Route not found', 404);
    const stops = await prisma.routeStop.findMany({
      where: { routeId: route.id },
      orderBy: { stopOrder: 'asc' },
    });
    res.json({ route: serialize(route), stops: serializeMany(stops) });
  } catch (err) {
    next(err);
  }
};

export const createRouteStop = async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({ where: { id: String(req.params.id) } });
    if (!route) throw new AppError('Route not found', 404);

    const { name, latitude, longitude, stopTime = '', stopOrder } = req.body;
    if (!name || latitude === undefined || longitude === undefined || latitude === '' || longitude === '') {
      throw new AppError('name, latitude and longitude are required', 400);
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new AppError('Latitude must be a number between -90 and 90', 400);
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new AppError('Longitude must be a number between -180 and 180', 400);
    }
    const order = stopOrder === undefined
      ? (await prisma.routeStop.count({ where: { routeId: route.id } })) + 1
      : Number(stopOrder);

    const stop = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        name: String(name),
        latitude: lat,
        longitude: lng,
        stopTime: String(stopTime),
        stopOrder: order,
      },
    });

    // Keep route.stops (name array) in sync so the old stop-list UI works too.
    const allStops = await prisma.routeStop.findMany({ where: { routeId: route.id }, orderBy: { stopOrder: 'asc' } });
    await prisma.route.update({
      where: { id: route.id },
      data: { stops: allStops.map((s) => s.name) },
    });

    res.status(201).json(serialize(stop));
  } catch (err) {
    next(err);
  }
};

export const deleteRouteStop = async (req, res, next) => {
  try {
    const stop = await prisma.routeStop.findUnique({ where: { id: String(req.params.stopId) } });
    if (!stop) throw new AppError('Stop not found', 404);
    await prisma.routeStop.delete({ where: { id: stop.id } });

    const remaining = await prisma.routeStop.findMany({ where: { routeId: stop.routeId }, orderBy: { stopOrder: 'asc' } });
    await prisma.route.update({
      where: { id: stop.routeId },
      data: { stops: remaining.map((s) => s.name) },
    });
    res.json({ message: 'Stop deleted' });
  } catch (err) {
    next(err);
  }
};
