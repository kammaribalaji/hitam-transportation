import { Router } from 'express';
import { getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute } from '../controllers/routeController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAllRoutes);
router.get('/:id', getRouteById);
router.post('/', authorize('ADMIN'), createRoute);
router.put('/:id', authorize('ADMIN'), updateRoute);
router.delete('/:id', authorize('ADMIN'), deleteRoute);

export default router;
