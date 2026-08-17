import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize } from '../lib/serialize.js';
import {
  isHypegpsEnabled,
  getAllDevices,
  getSyncInfo,
  getRouteForDevice,
  refreshRouteMapCache,
  HypeGpsError,
} from '../services/hypegpsService.js';

/**
 * Admin/debug view of the HypeGPS integration: sync status + every device
 * (id, status, coords when present, staleness) plus the effective route map.
 * The API hash is never included.
 */
export const getHypegpsStatus = async (req, res, next) => {
  try {
    if (!isHypegpsEnabled()) {
      throw new AppError(
        'Live tracking unavailable: HypeGPS is not configured. Set HYPEGPS_API_URL and HYPEGPS_API_HASH on the backend.',
        503
      );
    }

    let devices;
    try {
      devices = await getAllDevices();
    } catch (err) {
      if (err instanceof HypeGpsError) throw new AppError(err.message, 503);
      throw err;
    }

    const mapped = await Promise.all(
      devices.map(async (d) => ({ ...d, routeId: await getRouteForDevice(d.gpsDeviceId) }))
    );
    res.json({ ...(await getSyncInfo()), devices: mapped });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GpsDevice mapping CRUD (admin)
// ---------------------------------------------------------------------------

export const getMappings = async (req, res, next) => {
  try {
    const rows = await prisma.gpsDevice.findMany({ orderBy: { routeId: 'asc' } });
    res.json(rows.map(serialize));
  } catch (err) {
    next(err);
  }
};

export const createMapping = async (req, res, next) => {
  try {
    const { deviceId, busNumber, routeId } = req.body;
    if (!deviceId || !busNumber || !routeId) {
      throw new AppError('deviceId, busNumber and routeId are required', 400);
    }
    const route = await prisma.route.findUnique({ where: { id: String(routeId) } });
    if (!route) throw new AppError(`Route "${routeId}" does not exist`, 400);
    const bus = await prisma.bus.findUnique({ where: { busNumber: String(busNumber) } });
    if (!bus) throw new AppError(`Bus "${busNumber}" does not exist`, 400);

    const row = await prisma.gpsDevice.create({
      data: { deviceId: String(deviceId), busNumber: String(busNumber), routeId: String(routeId) },
    });
    refreshRouteMapCache();
    res.status(201).json(serialize(row));
  } catch (err) {
    next(err);
  }
};

export const updateMapping = async (req, res, next) => {
  try {
    const existing = await prisma.gpsDevice.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Mapping not found', 404);

    const data = {};
    if (req.body.deviceId !== undefined) data.deviceId = String(req.body.deviceId);
    if (req.body.busNumber !== undefined) {
      const bus = await prisma.bus.findUnique({ where: { busNumber: String(req.body.busNumber) } });
      if (!bus) throw new AppError(`Bus "${req.body.busNumber}" does not exist`, 400);
      data.busNumber = String(req.body.busNumber);
    }
    if (req.body.routeId !== undefined) {
      const route = await prisma.route.findUnique({ where: { id: String(req.body.routeId) } });
      if (!route) throw new AppError(`Route "${req.body.routeId}" does not exist`, 400);
      data.routeId = String(req.body.routeId);
    }

    const row = await prisma.gpsDevice.update({ where: { id: existing.id }, data });
    refreshRouteMapCache();
    res.json(serialize(row));
  } catch (err) {
    next(err);
  }
};

export const deleteMapping = async (req, res, next) => {
  try {
    const existing = await prisma.gpsDevice.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Mapping not found', 404);

    await prisma.gpsDevice.delete({ where: { id: existing.id } });
    refreshRouteMapCache();
    res.json({ message: 'Mapping deleted' });
  } catch (err) {
    next(err);
  }
};
