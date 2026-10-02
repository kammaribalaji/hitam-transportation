import prisma from '../lib/prisma.js';

// GET /api/wimb/stops/search?q=
export const searchStops = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    
    // Search distinct stop names
    const stops = await prisma.routeStop.findMany({
      where: {
        name: { startsWith: q, mode: 'insensitive' }
      },
      distinct: ['name'],
      select: {
        id: true,
        name: true,
        routeId: true
      },
      take: 20
    });
    
    // We want to return unique stop names, but also maybe which routes serve them.
    // If they share the same name, we can group them.
    const grouped = {};
    for (const stop of stops) {
      if (!grouped[stop.name]) {
        grouped[stop.name] = { id: stop.id, name: stop.name, routes: [] };
      }
      grouped[stop.name].routes.push(stop.routeId);
    }
    
    res.json(Object.values(grouped));
  } catch (err) {
    next(err);
  }
};

// GET /api/wimb/buses/search?q=
export const searchBuses = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);

    const buses = await prisma.bus.findMany({
      where: {
        OR: [
          { busNumber: { startsWith: q, mode: 'insensitive' } },
          { routeName: { startsWith: q, mode: 'insensitive' } },
          { routeId: { startsWith: q, mode: 'insensitive' } } // direct route match
        ]
      },
      take: 20
    });

    res.json(buses);
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
      where: { name: { equals: from, mode: 'insensitive' } }
    });
    
    const toStops = await prisma.routeStop.findMany({
      where: { name: { equals: to, mode: 'insensitive' } }
    });

    // Map routeId to stopOrder for 'to' stops
    const toMap = new Map();
    for (const t of toStops) {
      toMap.set(t.routeId, t.stopOrder);
    }

    const validRouteIds = [];
    for (const f of fromStops) {
      if (toMap.has(f.routeId)) {
        if (f.stopOrder < toMap.get(f.routeId)) {
          validRouteIds.push(f.routeId);
        }
      }
    }

    if (validRouteIds.length === 0) return res.json([]);

    // Find active buses on these valid routes
    const buses = await prisma.bus.findMany({
      where: {
        routeId: { in: validRouteIds }
      }
    });

    // For each bus, we can optionally attach route data
    const result = await Promise.all(buses.map(async (bus) => {
      const route = await prisma.route.findUnique({
        where: { id: bus.routeId },
        include: { 
          RouteStop: {
            orderBy: { stopOrder: 'asc' }
          } 
        }
      });
      return {
        ...bus,
        routeDetails: route
      };
    }));

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
      where: { id: busId }
    });
    
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    
    const route = await prisma.route.findUnique({
      where: { id: bus.routeId },
      include: {
        RouteStop: {
          orderBy: { stopOrder: 'asc' }
        }
      }
    });

    res.json({
      bus,
      route
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
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    
    if (stops.length === 0) return res.json([]);
    const validRouteIds = stops.map(s => s.routeId);

    const buses = await prisma.bus.findMany({
      where: {
        routeId: { in: validRouteIds }
      }
    });

    const result = await Promise.all(buses.map(async (bus) => {
      const route = await prisma.route.findUnique({
        where: { id: bus.routeId },
        include: { 
          RouteStop: {
            orderBy: { stopOrder: 'asc' }
          } 
        }
      });
      return {
        ...bus,
        routeDetails: route
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};
