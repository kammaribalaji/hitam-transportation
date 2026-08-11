import BusLocation from '../models/BusLocation.js';
import { AppError } from '../middlewares/errorHandler.js';

const isValidLat = (n) => Number.isFinite(n) && n >= -90 && n <= 90;
const isValidLng = (n) => Number.isFinite(n) && n >= -180 && n <= 180;

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

    const doc = await BusLocation.findOneAndUpdate(
      { driverRollNumber: req.user.rollNumber },
      {
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
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const getLiveLocationByRoute = async (req, res, next) => {
  try {
    const doc = await BusLocation.findOne({ routeId: req.params.routeId }).sort({ lastPingAt: -1 });
    if (!doc) throw new AppError('Live location not found for route', 404);
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

export const getLiveLocationByBus = async (req, res, next) => {
  try {
    const doc = await BusLocation.findOne({ busNumber: req.params.busNumber }).sort({ lastPingAt: -1 });
    if (!doc) throw new AppError('Live location not found for bus', 404);
    res.json(doc);
  } catch (err) {
    next(err);
  }
};
