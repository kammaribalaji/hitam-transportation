import { Router } from 'express';
import { getSeatsByRoute } from '../controllers/seatController.js';
import { protect, requireApprovedStudent } from '../middlewares/auth.js';

const router = Router();
router.use(protect);
router.use(requireApprovedStudent);
router.get('/:routeId', getSeatsByRoute);

export default router;
