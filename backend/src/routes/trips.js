import { Router } from 'express';
import { getAllTrips, getMyTrips, getTripById, updateTripStatus, createTrip, getTripSeats, getCurrentTrip } from '../controllers/tripController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN'), getAllTrips);
router.get('/my', authorize('DRIVER'), getMyTrips);
router.get('/current', getCurrentTrip);
router.get('/:tripId', getTripById);
router.get('/:tripId/seats', getTripSeats);
router.post('/', authorize('ADMIN', 'DRIVER'), createTrip);
router.put('/:tripId/status', authorize('DRIVER', 'ADMIN'), updateTripStatus);

export default router;
