import prisma from '../lib/prisma.js';

/**
 * Search stops by name (case-insensitive contains).
 * Returns unique stops (grouped by name) with the routes they belong to.
 * Returns [] for empty query — the frontend should not search on empty input.
 */
let stopsCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const searchStops = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const qLower = q.toLowerCase();
    const searchTerms = [qLower];
    
    const aliases = {
      'hitam': 'hitam college',
      'campus': 'hitam college',
      'college': 'hitam college'
    };

    if (aliases[qLower]) {
      searchTerms.push(aliases[qLower]);
    }

    if (!stopsCache || Date.now() - lastCacheTime > CACHE_TTL) {
      stopsCache = await prisma.routeStop.findMany({
        select: { id: true, name: true, routeId: true },
      });
      lastCacheTime = Date.now();
    }

    const matches = stopsCache.filter(stop => {
      const stopNameLower = stop.name.toLowerCase();
      return searchTerms.some(term => stopNameLower.includes(term));
    });

    const grouped = {};
    for (const stop of matches) {
      if (!grouped[stop.name]) {
        grouped[stop.name] = { id: stop.id, name: stop.name, routes: [] };
      }
      if (!grouped[stop.name].routes.includes(stop.routeId)) {
        grouped[stop.name].routes.push(stop.routeId);
      }
    }

    const results = Object.values(grouped).slice(0, 10);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

// GET /api/wimb/stops/destinations?fromStopId=&q=
export const getDestinations = async (req, res, next) => {
  try {
    const fromStopId = req.query.fromStopId;
    const q = req.query.q || '';
    
    if (!fromStopId) return res.json([]);

    const fromStop = await prisma.routeStop.findUnique({
      where: { id: fromStopId }
    });
    if (!fromStop) return res.json([]);

    // Get all stops with the same name across all routes (logical stop)
    const fromStops = await prisma.routeStop.findMany({
      where: { name: { equals: fromStop.name, mode: 'insensitive' } }
    });

    if (fromStops.length === 0) return res.json([]);

    const routeConditions = fromStops.map(s => ({
      routeId: s.routeId,
      stopOrder: { gt: s.stopOrder }
    }));

    const destinations = await prisma.routeStop.findMany({
      where: {
        AND: [
          { OR: routeConditions },
          q ? { name: { contains: q, mode: 'insensitive' } } : {}
        ]
      },
      select: {
        id: true,
        name: true,
        routeId: true
      }
    });

    const grouped = {};
    for (const stop of destinations) {
      if (!grouped[stop.name]) {
        grouped[stop.name] = { id: stop.id, name: stop.name, routes: [] };
      }
      if (!grouped[stop.name].routes.includes(stop.routeId)) {
        grouped[stop.name].routes.push(stop.routeId);
      }
    }
    
    res.json(Object.values(grouped).slice(0, 10));
  } catch (err) {
    next(err);
  }
};

// GET /api/wimb/routes/popular
export const getPopularRoutes = async (req, res, next) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      take: 6,
      select: {
        id: true,
        startPoint: true,
        endPoint: true
      }
    });

    const popular = routes.map(r => ({
      from: r.startPoint,
      to: r.endPoint || 'HITAM',
      route: r.id
    }));

    res.json(popular);
  } catch (err) {
    next(err);
  }
};

let busesCache = null;
let lastBusesCacheTime = 0;

// GET /api/wimb/buses/search?q=
export const searchBuses = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const qLower = q.toLowerCase();
    const isNumeric = /^\d+$/.test(qLower);

    if (!busesCache || Date.now() - lastBusesCacheTime > CACHE_TTL) {
      busesCache = await prisma.bus.findMany();
      lastBusesCacheTime = Date.now();
    }

    let matches = busesCache.filter(bus => {
      if (isNumeric && bus.routeId === qLower) return true;
      if (bus.routeId.toLowerCase().includes(qLower)) return true;
      if (bus.busNumber.toLowerCase().includes(qLower)) return true;
      if (bus.routeName && bus.routeName.toLowerCase().includes(qLower)) return true;
      return false;
    });

    matches.sort((a, b) => isNumeric ? a.routeId.localeCompare(b.routeId) : a.busNumber.localeCompare(b.busNumber));

    res.json(matches.slice(0, 20));
  } catch (err) {
    next(err);
  }
};

// GET /api/wimb/buses/between?from=&to=
export const findBusesBetweenStops = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.json([]);

    // Find routes that contain BOTH stops, with 'from' before 'to'
    const fromStops = await prisma.routeStop.findMany({
      where: { name: { equals: from, mode: 'insensitive' } },
    });

    const toStops = await prisma.routeStop.findMany({
      where: { name: { equals: to, mode: 'insensitive' } },
    });

    // Map routeId to stopOrder for 'to' stops
    const toMap = new Map();
    for (const t of toStops) {
      toMap.set(t.routeId, t.stopOrder);
    }

    const validRouteIds = [];
    for (const f of fromStops) {
      if (toMap.has(f.routeId) && f.stopOrder < toMap.get(f.routeId)) {
        validRouteIds.push(f.routeId);
      }
    }

    if (validRouteIds.length === 0) return res.json([]);

    // Find active buses on these valid routes
    const buses = await prisma.bus.findMany({
      where: { routeId: { in: validRouteIds } },
    });

    let liveByRoute = {};
    if (buses.length > 0) {
      const locations = await prisma.busLocation.findMany({
        where: { routeId: { in: validRouteIds } },
        orderBy: { lastPingAt: 'desc' },
        select: { routeId: true, latitude: true, longitude: true, speed: true, heading: true, status: true, source: true, lastPingAt: true },
      });
      for (const loc of locations) {
        if (!liveByRoute[loc.routeId] || (loc.lastPingAt && loc.lastPingAt > (liveByRoute[loc.routeId]?.lastPingAt || 0))) {
          liveByRoute[loc.routeId] = loc;
        }
      }
    }

    // For each bus, attach route data + current location + current trip
    const result = await Promise.all(
      buses.map(async (bus) => {
        const route = await prisma.route.findUnique({
          where: { id: bus.routeId },
          include: { routeStops: { orderBy: { stopOrder: 'asc' } } },
        });
        const currentTrip = route
          ? await prisma.trip.findFirst({
              where: { routeId: bus.routeId, busNumber: bus.busNumber, status: 'IN_PROGRESS' },
              orderBy: { startTime: 'desc' },
            })
          : null;
        return {
          ...bus,
          routeDetails: route,
          currentLocation: liveByRoute[bus.routeId] || null,
          currentTrip,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/wimb/buses/:busId
export const getBusDetails = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
    });

    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    const route = await prisma.route.findUnique({
      where: { id: bus.routeId },
      include: {
        routeStops: { orderBy: { stopOrder: 'asc' } },
      },
    });

    let currentLocation = null;
    if (route) {
      const loc = await prisma.busLocation.findFirst({
        where: { routeId: bus.routeId },
        orderBy: { lastPingAt: 'desc' },
        select: { latitude: true, longitude: true, speed: true, heading: true, status: true, source: true, lastPingAt: true },
      });
      if (loc && loc.lastPingAt) currentLocation = loc;
    }

    const currentTrip = route
      ? await prisma.trip.findFirst({
          where: { routeId: bus.routeId, busNumber: bus.busNumber, status: 'IN_PROGRESS' },
          orderBy: { startTime: 'desc' },
        })
      : null;

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

// GET /api/wimb/buses/stop?name=
export const findBusesByStop = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) return res.json([]);

    const stops = await prisma.routeStop.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (stops.length === 0) return res.json([]);
    const validRouteIds = stops.map((s) => s.routeId);

    const buses = await prisma.bus.findMany({
      where: { routeId: { in: validRouteIds } },
    });

    let liveByRoute = {};
    if (buses.length > 0) {
      const locations = await prisma.busLocation.findMany({
        where: { routeId: { in: validRouteIds } },
        orderBy: { lastPingAt: 'desc' },
        select: { routeId: true, latitude: true, longitude: true, speed: true, heading: true, status: true, source: true, lastPingAt: true },
      });
      for (const loc of locations) {
        if (!liveByRoute[loc.routeId] || (loc.lastPingAt && loc.lastPingAt > (liveByRoute[loc.routeId]?.lastPingAt || 0))) {
          liveByRoute[loc.routeId] = loc;
        }
      }
    }

    const result = await Promise.all(
      buses.map(async (bus) => {
        const route = await prisma.route.findUnique({
          where: { id: bus.routeId },
          include: {
            routeStops: { orderBy: { stopOrder: 'asc' } },
          },
        });
        const currentTrip = route
          ? await prisma.trip.findFirst({
              where: { routeId: bus.routeId, busNumber: bus.busNumber, status: 'IN_PROGRESS' },
              orderBy: { startTime: 'desc' },
            })
          : null;
        return {
          ...bus,
          routeDetails: route,
          currentLocation: liveByRoute[bus.routeId] || null,
          currentTrip,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};// GET /api/wimb/buses/search-between?fromStopId=&toStopId=
export const searchBusesBetween = async (req, res, next) => {
  try {
    const { fromStopId, toStopId } = req.query;
    if (!fromStopId || !toStopId) return res.json([]);

    const fromStop = await prisma.routeStop.findUnique({ where: { id: fromStopId } });
    const toStop = await prisma.routeStop.findUnique({ where: { id: toStopId } });

    if (!fromStop || !toStop) return res.json([]);

    const fromStops = await prisma.routeStop.findMany({
      where: { name: { equals: fromStop.name, mode: 'insensitive' } },
    });

    const toStops = await prisma.routeStop.findMany({
      where: { name: { equals: toStop.name, mode: 'insensitive' } },
    });

    const toMap = new Map();
    for (const t of toStops) {
      toMap.set(t.routeId, t.stopOrder);
    }

    const validRouteIds = [];
    for (const f of fromStops) {
      if (toMap.has(f.routeId) && f.stopOrder < toMap.get(f.routeId)) {
        validRouteIds.push(f.routeId);
      }
    }

    if (validRouteIds.length === 0) return res.json([]);

    const buses = await prisma.bus.findMany({
      where: { routeId: { in: validRouteIds } },
    });

    // Batch-fetch live locations for the matching routes (one query, not N).
    // Attach current position so the results page can show status / ETA
    // without extra per-bus calls.
    let liveByRoute = {};
    if (buses.length > 0) {
      const locations = await prisma.busLocation.findMany({
        where: { routeId: { in: validRouteIds } },
        orderBy: { lastPingAt: 'desc' },
        select: { routeId: true, busNumber: true, latitude: true, longitude: true, speed: true, heading: true, status: true, source: true, lastPingAt: true },
      });
      for (const loc of locations) {
        if (!liveByRoute[loc.routeId] || (loc.lastPingAt && loc.lastPingAt > (liveByRoute[loc.routeId]?.lastPingAt || 0))) {
          liveByRoute[loc.routeId] = loc;
        }
      }
    }

    const result = await Promise.all(
      buses.map(async (bus) => {
        const route = await prisma.route.findUnique({
          where: { id: bus.routeId },
          include: { routeStops: { orderBy: { stopOrder: 'asc' } } },
        });
        const currentTrip = route
          ? await prisma.trip.findFirst({
              where: { routeId: bus.routeId, busNumber: bus.busNumber, status: 'IN_PROGRESS' },
              orderBy: { startTime: 'desc' },
            })
          : null;
        return {
          ...bus,
          routeDetails: route,
          currentLocation: liveByRoute[bus.routeId] || null,
          currentTrip,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

