import { Router } from 'express';
import { getSeatsByRoute } from '../controllers/seatController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();
router.use(protect);
router.get('/:routeId', getSeatsByRoute);

export default router;
