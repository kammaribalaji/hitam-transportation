import { Router } from 'express';
import {
  getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute,
  getRouteStops, createRouteStop, deleteRouteStop,
} from '../controllers/routeController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAllRoutes);
router.get('/:id', getRouteById);

// Stops (real lat/lng + schedule) — /api/routes/12/stops
router.get('/:id/stops', getRouteStops);
router.post('/:id/stops', authorize('ADMIN'), createRouteStop);
router.delete('/:id/stops/:stopId', authorize('ADMIN'), deleteRouteStop);

router.post('/', authorize('ADMIN'), createRoute);
router.put('/:id', authorize('ADMIN'), updateRoute);
router.delete('/:id', authorize('ADMIN'), deleteRoute);

export default router;
