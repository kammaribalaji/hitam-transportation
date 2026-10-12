import { Router } from 'express';
import { getTrackingByTrip, postTrackingLocation } from '../controllers/trackingController.js';
import { protect, authorize, requirePaidStudent } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/:tripId', requirePaidStudent, getTrackingByTrip);
router.post('/:tripId/location', authorize('DRIVER', 'ADMIN'), postTrackingLocation);

export default router;
