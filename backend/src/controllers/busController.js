import Bus from '../models/Bus.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getAllBuses = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { busNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { routeName: { $regex: search, $options: 'i' } },
      ];
    }
    const buses = await Bus.find(filter).sort({ busNumber: 1 });
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

export const getBusByNumber = async (req, res, next) => {
  try {
    const bus = await Bus.findOne({ busNumber: req.params.busNumber });
    if (!bus) throw new AppError('Bus not found', 404);
    res.json(bus);
  } catch (err) {
    next(err);
  }
};

export const createBus = async (req, res, next) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (err) {
    next(err);
  }
};

export const updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findOneAndUpdate({ busNumber: req.params.busNumber }, req.body, { new: true });
    if (!bus) throw new AppError('Bus not found', 404);
    res.json(bus);
  } catch (err) {
    next(err);
  }
};

export const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findOneAndDelete({ busNumber: req.params.busNumber });
    if (!bus) throw new AppError('Bus not found', 404);
    res.json({ message: 'Bus deleted' });
  } catch (err) {
    next(err);
  }
};
