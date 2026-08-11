import Trip from '../models/Trip.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getAllTrips = async (req, res, next) => {
  try {
    const { status, driverRollNumber, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (driverRollNumber) filter.driverRollNumber = driverRollNumber;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [trips, total] = await Promise.all([
      Trip.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Trip.countDocuments(filter),
    ]);
    res.json({ trips, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const getMyTrips = async (req, res, next) => {
  try {
    const trips = await Trip.find({ driverRollNumber: req.user.rollNumber }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    next(err);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId });
    if (!trip) throw new AppError('Trip not found', 404);
    res.json(trip);
  } catch (err) {
    next(err);
  }
};

export const updateTripStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findOneAndUpdate(
      { tripId: req.params.tripId },
      { status: status.toUpperCase() },
      { new: true }
    );
    if (!trip) throw new AppError('Trip not found', 404);
    res.json(trip);
  } catch (err) {
    next(err);
  }
};

export const createTrip = async (req, res, next) => {
  try {
    const trip = await Trip.create(req.body);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
};
