import { Router } from 'express';
import { getAllBuses, getBusByNumber, createBus, updateBus, deleteBus } from '../controllers/busController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAllBuses);
router.get('/:busNumber', getBusByNumber);
router.post('/', authorize('ADMIN'), createBus);
router.put('/:busNumber', authorize('ADMIN', 'DRIVER'), updateBus);
router.delete('/:busNumber', authorize('ADMIN'), deleteBus);

export default router;
