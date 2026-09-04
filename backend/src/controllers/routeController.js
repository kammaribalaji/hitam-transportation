import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const num = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

const polylinesDir = path.resolve('./src/data/polylines');

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
    const routeId = String(req.params.id);
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) throw new AppError('Route not found', 404);
    
    const today = new Date().toISOString().split('T')[0];
    const [stops, departureLogs] = await Promise.all([
      prisma.routeStop.findMany({
        where: { routeId: route.id },
        orderBy: { stopOrder: 'asc' },
      }),
      prisma.stopDepartureLog.findMany({
        where: { routeId: route.id, date: today },
      }),
    ]);

    const departureMap = new Map();
    for (const log of departureLogs) {
      departureMap.set(log.stopOrder, log);
    }

    const mergedStops = stops.map(s => {
      const log = departureMap.get(s.stopOrder);
      return {
        ...s,
        actualDepartureTime: log?.departedTime || s.actualDepartureTime || '',
        departureStatus: log ? 'DEPARTED' : (s.actualDepartureTime ? 'DEPARTED' : 'SCHEDULED'),
        departedAt: log?.departedAt || s.departedAt || null,
      };
    });

    res.json({ route: serialize(route), stops: serializeMany(mergedStops), departures: serializeMany(departureLogs) });
  } catch (err) {
    next(err);
  }
};

export const recordStopDeparture = async (req, res, next) => {
  try {
    const routeId = String(req.params.id);
    const stopId = String(req.params.stopId);
    const { departedTime } = req.body;

    const stop = await prisma.routeStop.findFirst({
      where: { id: stopId, routeId },
    });

    if (!stop) throw new AppError('Route stop not found', 404);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeStr = departedTime || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const route = await prisma.route.findUnique({ where: { id: routeId } });

    const log = await prisma.stopDepartureLog.create({
      data: {
        routeId,
        stopName: stop.name,
        stopOrder: stop.stopOrder,
        scheduledTime: stop.stopTime || '',
        departedTime: timeStr,
        date: today,
        busNumber: route?.busNumber || '',
        status: 'DEPARTED',
        departedAt: now,
      },
    });

    await prisma.routeStop.update({
      where: { id: stop.id },
      data: {
        actualDepartureTime: timeStr,
        departedAt: now,
      },
    });

    res.json({ message: 'Departure saved successfully', log: serialize(log) });
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

    // Keep route.stops (name array) in sync
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

// ---------------------------------------------------------------------------
// Google Maps-like road polyline geometries for all 23 routes
// ---------------------------------------------------------------------------

export const getRoutePolyline = async (req, res, next) => {
  try {
    const routeId = String(req.params.id).replace(/\D/g, '');
    const filePath = path.join(polylinesDir, `route${routeId}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.json({ routeId, coordinates: data, pointsCount: data.length, source: 'road_geometry' });
    }
    // Fallback to stops
    const stops = await prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { stopOrder: 'asc' },
    });
    const coordinates = stops.map((s) => [s.latitude, s.longitude]);
    res.json({ routeId, coordinates, pointsCount: coordinates.length, source: 'stops_fallback' });
  } catch (err) {
    next(err);
  }
};

export const getAllPolylines = async (req, res, next) => {
  try {
    const result = {};
    for (let i = 1; i <= 23; i++) {
      const filePath = path.join(polylinesDir, `route${i}.json`);
      if (fs.existsSync(filePath)) {
        result[`route${i}`] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};
