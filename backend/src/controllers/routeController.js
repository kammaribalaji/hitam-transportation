import Route from '../models/Route.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getAllRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find({ isActive: true }).sort({ id: 1 });
    res.json(routes);
  } catch (err) {
    next(err);
  }
};

export const getRouteById = async (req, res, next) => {
  try {
    const route = await Route.findOne({ id: req.params.id });
    if (!route) throw new AppError('Route not found', 404);
    res.json(route);
  } catch (err) {
    next(err);
  }
};

export const createRoute = async (req, res, next) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    next(err);
  }
};

export const updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!route) throw new AppError('Route not found', 404);
    res.json(route);
  } catch (err) {
    next(err);
  }
};

export const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findOneAndUpdate({ id: req.params.id }, { isActive: false }, { new: true });
    if (!route) throw new AppError('Route not found', 404);
    res.json({ message: 'Route deactivated' });
  } catch (err) {
    next(err);
  }
};
