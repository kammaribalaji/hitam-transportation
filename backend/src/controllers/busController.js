import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const num = (v, fallback = 0) => (v === undefined || v === null || v === '' ? fallback : Number(v));

const BUS_FIELDS = {
  busNumber: (v) => String(v),
  busType: (v) => String(v),
  capacity: (v) => num(v, 40),
  driverId: (v) => String(v),
  driverName: (v) => String(v),
  routeId: (v) => String(v),
  routeName: (v) => String(v),
  status: (v) => String(v).toUpperCase(),
  fuelLevel: (v) => num(v, 75),
  engineStatus: (v) => String(v),
  batteryHealth: (v) => String(v),
  tirePressure: (v) => String(v),
  odometer: (v) => num(v, 45230),
  lastService: (v) => String(v),
  model: (v) => String(v),
};

const buildBusData = (body, extra = {}) => {
  const data = { ...extra };
  for (const [key, coerce] of Object.entries(BUS_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getAllBuses = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { busNumber: { contains: search, mode: 'insensitive' } },
        { driverName: { contains: search, mode: 'insensitive' } },
        { routeName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const buses = await prisma.bus.findMany({ where, orderBy: { busNumber: 'asc' } });
    res.json(serializeMany(buses));
  } catch (err) {
    next(err);
  }
};

export const getBusByNumber = async (req, res, next) => {
  try {
    const bus = await prisma.bus.findUnique({ where: { busNumber: String(req.params.busNumber) } });
    if (!bus) throw new AppError('Bus not found', 404);
    res.json(serialize(bus));
  } catch (err) {
    next(err);
  }
};

export const createBus = async (req, res, next) => {
  try {
    const bus = await prisma.bus.create({ data: buildBusData(req.body, { busNumber: String(req.body.busNumber) }) });
    res.status(201).json(serialize(bus));
  } catch (err) {
    next(err);
  }
};

export const updateBus = async (req, res, next) => {
  try {
    const existing = await prisma.bus.findUnique({ where: { busNumber: String(req.params.busNumber) } });
    if (!existing) throw new AppError('Bus not found', 404);
    const bus = await prisma.bus.update({ where: { id: existing.id }, data: buildBusData(req.body) });
    res.json(serialize(bus));
  } catch (err) {
    next(err);
  }
};

export const deleteBus = async (req, res, next) => {
  try {
    const existing = await prisma.bus.findUnique({ where: { busNumber: String(req.params.busNumber) } });
    if (!existing) throw new AppError('Bus not found', 404);
    await prisma.bus.delete({ where: { id: existing.id } });
    res.json({ message: 'Bus deleted' });
  } catch (err) {
    next(err);
  }
};
