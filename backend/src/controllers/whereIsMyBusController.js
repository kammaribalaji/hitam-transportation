import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const isUuid = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

let stopsCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let busesCache = null;
let lastBusesCacheTime = 0;

/**
 * Search stops by name (case-insensitive contains).
 * Returns unique stops (grouped by name) with the routes they belong to and valid UUID.
 */
export const searchStops = async (req, res, next) => {
  try {
    const rawQ = (req.query.q || '').trim();
    if (!rawQ) return res.json([]);

    const qLower = rawQ.toLowerCase();
    const searchTerms = [qLower];

    const aliases = {
      hitam: 'hitam college',
      campus: 'hitam college',
      college: 'hitam college',
      sangareddy: 'sangareddy',
      kphb: 'kphb',
      jntu: 'jntu',
    };

    if (aliases[qLower] && !searchTerms.includes(aliases[qLower])) {
      searchTerms.push(aliases[qLower]);
    }

    if (!stopsCache || Date.now() - lastCacheTime > CACHE_TTL) {
      stopsCache = await prisma.routeStop.findMany({
        select: { id: true, name: true, routeId: true, stopOrder: true },
        orderBy: [{ name: 'asc' }, { stopOrder: 'asc' }],
      });
      lastCacheTime = Date.now();
    }

    const matches = stopsCache.filter((stop) => {
      const stopNameLower = stop.name.toLowerCase();
      return searchTerms.some((term) => stopNameLower.includes(term));
    });

    const grouped = {};
    for (const stop of matches) {
      const normalizedName = stop.name.trim();
      if (!grouped[normalizedName]) {
        grouped[normalizedName] = {
          id: stop.id,
          name: normalizedName,
          routes: [],
          stopCount: 0,
        };
      }
      if (!grouped[normalizedName].routes.includes(stop.routeId)) {
        grouped[normalizedName].routes.push(stop.routeId);
        grouped[normalizedName].stopCount++;
      }
    }

    const results = Object.values(grouped).slice(0, 15);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/stops/destinations?fromStopId=&q=
 * Returns valid downstream destinations for a chosen origin stop.
 */
export const getDestinations = async (req, res, next) => {
  try {
    const fromParam = (req.query.fromStopId || req.query.from || '').trim();
    const q = (req.query.q || '').trim();

    if (!fromParam) return res.json([]);

    let fromStop = null;
    if (isUuid(fromParam)) {
      fromStop = await prisma.routeStop.findUnique({ where: { id: fromParam } });
    }
    if (!fromStop) {
      fromStop = await prisma.routeStop.findFirst({
        where: { name: { contains: fromParam, mode: 'insensitive' } },
      });
    }

    if (!fromStop) return res.json([]);

    const fromStops = await prisma.routeStop.findMany({
      where: { name: { equals: fromStop.name, mode: 'insensitive' } },
    });

    if (fromStops.length === 0) return res.json([]);

    const routeConditions = fromStops.map((s) => ({
      routeId: s.routeId,
      stopOrder: { gt: s.stopOrder },
    }));

    const destinations = await prisma.routeStop.findMany({
      where: {
        AND: [
          { OR: routeConditions },
          q ? { name: { contains: q, mode: 'insensitive' } } : {},
        ],
      },
      select: {
        id: true,
        name: true,
        routeId: true,
        stopOrder: true,
      },
    });

    const grouped = {};
    for (const stop of destinations) {
      const normalizedName = stop.name.trim();
      if (!grouped[normalizedName]) {
        grouped[normalizedName] = { id: stop.id, name: normalizedName, routes: [] };
      }
      if (!grouped[normalizedName].routes.includes(stop.routeId)) {
        grouped[normalizedName].routes.push(stop.routeId);
      }
    }

    res.json(Object.values(grouped).slice(0, 15));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/routes/popular
 * Returns active college routes with their start and terminal stops and IDs.
 */
export const getPopularRoutes = async (req, res, next) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      take: 6,
      select: {
        id: true,
        name: true,
        busNumber: true,
        startPoint: true,
        endPoint: true,
        routeStops: {
          select: { id: true, name: true, stopOrder: true },
          orderBy: { stopOrder: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const popular = routes.map((r) => {
      const firstStop = r.routeStops?.[0];
      const lastStop = r.routeStops?.[r.routeStops.length - 1];
      return {
        route: `R${r.id}`,
        routeId: r.id,
        busNumber: r.busNumber,
        from: r.startPoint || firstStop?.name || 'Start',
        to: r.endPoint || lastStop?.name || 'HITAM College',
        fromStopId: firstStop?.id || null,
        fromStopName: firstStop?.name || r.startPoint || 'Start',
        toStopId: lastStop?.id || null,
        toStopName: lastStop?.name || r.endPoint || 'HITAM College',
      };
    });

    res.json(popular);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/buses/search?q=
 * Supports searching buses by bus number, route ID, or route name.
 */
export const searchBuses = async (req, res, next) => {
  try {
    const rawQ = (req.query.q || '').trim();
    if (!rawQ) return res.json([]);

    const qLower = rawQ.toLowerCase();
    const isNumeric = /^\d+$/.test(qLower);
    const normalizedRouteNum = qLower.replace(/^r(oute)?\s*(\d+)$/i, '$2');

    if (!busesCache || Date.now() - lastBusesCacheTime > CACHE_TTL) {
      busesCache = await prisma.bus.findMany({
        where: { status: 'ACTIVE' },
      });
      lastBusesCacheTime = Date.now();
    }

    let matches = busesCache.filter((bus) => {
      if (isNumeric && bus.routeId === qLower) return true;
      if (normalizedRouteNum && bus.routeId === normalizedRouteNum) return true;
      if (bus.routeId.toLowerCase().includes(qLower)) return true;
      if (bus.busNumber.toLowerCase().includes(qLower)) return true;
      if (bus.routeName && bus.routeName.toLowerCase().includes(qLower)) return true;
      return false;
    });

    matches.sort((a, b) => {
      const aNum = parseInt(a.routeId) || 0;
      const bNum = parseInt(b.routeId) || 0;
      return aNum - bNum || a.busNumber.localeCompare(b.busNumber);
    });

    res.json(matches.slice(0, 20));
  } catch (err) {
    next(err);
  }
};

/**
 * Core route-matching and bus-lookup engine.
 * Resolves origin and destination, checks route stop ordering in PostgreSQL,
 * queries active buses, and retrieves safe live locations without Prisma schema crashes.
 */
async function executeBusSearch({ fromStopId, toStopId, fromName, toName }) {
  const cleanFromId = fromStopId ? String(fromStopId).trim() : '';
  const cleanToId = toStopId ? String(toStopId).trim() : '';
  const cleanFromName = fromName ? String(fromName).trim() : '';
  const cleanToName = toName ? String(toName).trim() : '';

  // Same-stop selection validation
  if (cleanFromId && cleanToId && cleanFromId === cleanToId) {
    throw new AppError('Origin and destination stops cannot be the same.', 400);
  }
  if (
    cleanFromName &&
    cleanToName &&
    cleanFromName.toLowerCase() === cleanToName.toLowerCase()
  ) {
    throw new AppError('Origin and destination stops cannot be the same.', 400);
  }

  // 1. Resolve origin stop(s)
  let originStops = [];
  if (cleanFromId && isUuid(cleanFromId)) {
    const stopRecord = await prisma.routeStop.findUnique({ where: { id: cleanFromId } });
    if (stopRecord) {
      // Find all stops across all routes sharing this name
      originStops = await prisma.routeStop.findMany({
        where: { name: { equals: stopRecord.name, mode: 'insensitive' } },
      });
    }
  }

  if (originStops.length === 0 && (cleanFromName || cleanFromId)) {
    const term = cleanFromName || cleanFromId;
    originStops = await prisma.routeStop.findMany({
      where: {
        OR: [
          { name: { equals: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
    });
  }

  // 2. Resolve destination stop(s)
  let destStops = [];
  if (cleanToId && isUuid(cleanToId)) {
    const stopRecord = await prisma.routeStop.findUnique({ where: { id: cleanToId } });
    if (stopRecord) {
      destStops = await prisma.routeStop.findMany({
        where: { name: { equals: stopRecord.name, mode: 'insensitive' } },
      });
    }
  }

  if (destStops.length === 0 && (cleanToName || cleanToId)) {
    const term = cleanToName || cleanToId;
    destStops = await prisma.routeStop.findMany({
      where: {
        OR: [
          { name: { equals: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
    });
  }

  if (originStops.length === 0 || destStops.length === 0) {
    return [];
  }

  // 3. Map destination stops by routeId
  // A route may have multiple stops matching; record the destination stop with highest stopOrder
  const destByRoute = new Map();
  for (const d of destStops) {
    const current = destByRoute.get(d.routeId);
    if (!current || d.stopOrder > current.stopOrder) {
      destByRoute.set(d.routeId, d);
    }
  }

  // 4. Find routes where origin occurs before destination
  const validRouteMatches = new Map();
  for (const o of originStops) {
    const targetDest = destByRoute.get(o.routeId);
    if (targetDest && o.stopOrder < targetDest.stopOrder) {
      if (!validRouteMatches.has(o.routeId)) {
        validRouteMatches.set(o.routeId, {
          routeId: o.routeId,
          originStop: o,
          destinationStop: targetDest,
        });
      }
    }
  }

  const validRouteIds = Array.from(validRouteMatches.keys());
  if (validRouteIds.length === 0) {
    return [];
  }

  // 5. Query active routes and active buses in PostgreSQL
  const [routes, buses] = await Promise.all([
    prisma.route.findMany({
      where: { id: { in: validRouteIds }, isActive: true },
      include: {
        routeStops: { orderBy: { stopOrder: 'asc' } },
      },
    }),
    prisma.bus.findMany({
      where: { routeId: { in: validRouteIds }, status: 'ACTIVE' },
    }),
  ]);

  if (buses.length === 0) {
    return [];
  }

  const routeMap = new Map(routes.map((r) => [r.id, r]));

  // 6. Safe location batch-fetch: Select only valid BusLocation model fields (NO status!)
  let liveByRoute = {};
  try {
    const locations = await prisma.busLocation.findMany({
      where: { routeId: { in: validRouteIds } },
      orderBy: { lastPingAt: 'desc' },
      select: {
        id: true,
        driverRollNumber: true,
        routeId: true,
        busNumber: true,
        latitude: true,
        longitude: true,
        speed: true,
        heading: true,
        source: true,
        lastPingAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    for (const loc of locations) {
      if (!liveByRoute[loc.routeId] || (loc.lastPingAt && loc.lastPingAt > (liveByRoute[loc.routeId]?.lastPingAt || 0))) {
        // Synthesize safe UI status from speed and freshness without querying invalid column
        const ageMs = Date.now() - new Date(loc.lastPingAt).getTime();
        const uiStatus = ageMs < 10 * 60 * 1000 ? (loc.speed > 5 ? 'MOVING' : 'IDLE') : 'OFFLINE';
        liveByRoute[loc.routeId] = {
          ...loc,
          status: uiStatus,
        };
      }
    }
  } catch (locErr) {
    console.warn('[BusSearch] Warning loading live locations:', locErr.message);
  }

  // 7. Batch-fetch active trips for matching buses
  let tripByBus = new Map();
  try {
    const activeTrips = await prisma.trip.findMany({
      where: {
        routeId: { in: validRouteIds },
        status: 'IN_PROGRESS',
      },
      orderBy: { startTime: 'desc' },
    });
    for (const trip of activeTrips) {
      if (!tripByBus.has(trip.busNumber)) {
        tripByBus.set(trip.busNumber, trip);
      }
    }
  } catch (tripErr) {
    console.warn('[BusSearch] Warning loading active trips:', tripErr.message);
  }

  // 8. Construct formatted response
  const results = buses.map((bus) => {
    const route = routeMap.get(bus.routeId) || null;
    const match = validRouteMatches.get(bus.routeId);
    const origin = match?.originStop || null;
    const destination = match?.destinationStop || null;

    let intermediateStops = 0;
    if (route?.routeStops && origin && destination) {
      intermediateStops = Math.max(0, destination.stopOrder - origin.stopOrder - 1);
    }

    return {
      id: bus.id,
      busNumber: bus.busNumber,
      busType: bus.busType || 'Standard College Bus',
      capacity: bus.capacity || 40,
      driverName: bus.driverName || 'Designated College Driver',
      routeId: bus.routeId,
      routeName: bus.routeName || route?.name || `Route ${bus.routeId}`,
      status: bus.status || 'ACTIVE',
      originStop: origin ? { name: origin.name, stopOrder: origin.stopOrder, stopTime: origin.stopTime } : null,
      destinationStop: destination ? { name: destination.name, stopOrder: destination.stopOrder, stopTime: destination.stopTime } : null,
      intermediateStopsCount: intermediateStops,
      fare: route?.feeAmount || 12000,
      reportingTime: route?.reportingTime || '07:30 AM',
      routeDetails: route,
      currentLocation: liveByRoute[bus.routeId] || null,
      currentTrip: tripByBus.get(bus.busNumber) || null,
    };
  });

  return results;
}

/**
 * GET /api/wimb/buses/between?from=&to=
 */
export const findBusesBetweenStops = async (req, res, next) => {
  try {
    const { from, to, fromStopId, toStopId, fromName, toName } = req.query;
    const results = await executeBusSearch({
      fromStopId: fromStopId || (isUuid(from) ? from : null),
      toStopId: toStopId || (isUuid(to) ? to : null),
      fromName: fromName || (!isUuid(from) ? from : null),
      toName: toName || (!isUuid(to) ? to : null),
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/buses/search-between?fromStopId=&toStopId=
 */
export const searchBusesBetween = async (req, res, next) => {
  try {
    const { fromStopId, toStopId, from, to, fromName, toName } = req.query;
    const results = await executeBusSearch({
      fromStopId: fromStopId || (isUuid(from) ? from : null),
      toStopId: toStopId || (isUuid(to) ? to : null),
      fromName: fromName || (!isUuid(from) ? from : null),
      toName: toName || (!isUuid(to) ? to : null),
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/buses/stop?id=&stopId=&name=
 * Returns active buses serving a specific stop.
 */
export const findBusesByStop = async (req, res, next) => {
  try {
    const { id, stopId, name } = req.query;
    const targetId = id || stopId;
    const targetName = name ? String(name).trim() : '';

    if (!targetId && !targetName) {
      return res.json([]);
    }

    let stops = [];
    if (targetId && isUuid(targetId)) {
      const stopRecord = await prisma.routeStop.findUnique({ where: { id: targetId } });
      if (stopRecord) {
        stops = await prisma.routeStop.findMany({
          where: { name: { equals: stopRecord.name, mode: 'insensitive' } },
        });
      }
    }

    if (stops.length === 0 && (targetName || targetId)) {
      const term = targetName || targetId;
      stops = await prisma.routeStop.findMany({
        where: {
          OR: [
            { name: { equals: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (stops.length === 0) return res.json([]);

    const validRouteIds = [...new Set(stops.map((s) => s.routeId))];

    const [routes, buses] = await Promise.all([
      prisma.route.findMany({
        where: { id: { in: validRouteIds }, isActive: true },
        include: { routeStops: { orderBy: { stopOrder: 'asc' } } },
      }),
      prisma.bus.findMany({
        where: { routeId: { in: validRouteIds }, status: 'ACTIVE' },
      }),
    ]);

    if (buses.length === 0) return res.json([]);

    const routeMap = new Map(routes.map((r) => [r.id, r]));

    let liveByRoute = {};
    try {
      const locations = await prisma.busLocation.findMany({
        where: { routeId: { in: validRouteIds } },
        orderBy: { lastPingAt: 'desc' },
        select: {
          id: true,
          driverRollNumber: true,
          routeId: true,
          busNumber: true,
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          source: true,
          lastPingAt: true,
        },
      });
      for (const loc of locations) {
        if (!liveByRoute[loc.routeId] || (loc.lastPingAt && loc.lastPingAt > (liveByRoute[loc.routeId]?.lastPingAt || 0))) {
          liveByRoute[loc.routeId] = loc;
        }
      }
    } catch {}

    const result = buses.map((bus) => {
      const route = routeMap.get(bus.routeId) || null;
      return {
        id: bus.id,
        busNumber: bus.busNumber,
        busType: bus.busType,
        capacity: bus.capacity,
        routeId: bus.routeId,
        routeName: bus.routeName || route?.name,
        status: bus.status,
        routeDetails: route,
        currentLocation: liveByRoute[bus.routeId] || null,
        currentTrip: null,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wimb/buses/:busId
 * Returns bus details by UUID or busNumber.
 */
export const getBusDetails = async (req, res, next) => {
  try {
    const { busId } = req.params;
    if (!busId) throw new AppError('Bus identifier is required', 400);

    let bus = null;
    if (isUuid(busId)) {
      bus = await prisma.bus.findUnique({ where: { id: busId } });
    }
    if (!bus) {
      bus = await prisma.bus.findFirst({
        where: {
          OR: [
            { busNumber: busId },
            { busNumber: { equals: busId, mode: 'insensitive' } },
            { routeId: busId },
          ],
        },
      });
    }

    if (!bus) throw new AppError('Bus not found in database', 404);

    const route = await prisma.route.findUnique({
      where: { id: bus.routeId },
      include: {
        routeStops: { orderBy: { stopOrder: 'asc' } },
      },
    });

    let currentLocation = null;
    try {
      const loc = await prisma.busLocation.findFirst({
        where: { routeId: bus.routeId },
        orderBy: { lastPingAt: 'desc' },
        select: {
          id: true,
          driverRollNumber: true,
          routeId: true,
          busNumber: true,
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          source: true,
          lastPingAt: true,
        },
      });
      if (loc && loc.lastPingAt) {
        currentLocation = loc;
      }
    } catch {}

    let currentTrip = null;
    try {
      currentTrip = await prisma.trip.findFirst({
        where: { routeId: bus.routeId, busNumber: bus.busNumber, status: 'IN_PROGRESS' },
        orderBy: { startTime: 'desc' },
      });
    } catch {}

    res.json({
      ...bus,
      routeDetails: route,
      currentLocation,
      currentTrip,
    });
  } catch (err) {
    next(err);
  }
};
