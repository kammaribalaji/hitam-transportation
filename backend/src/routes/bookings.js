import { Router } from 'express';
import { getAllBookings, getMyBooking, createBooking, cancelBooking } from '../controllers/bookingController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN', 'DRIVER'), getAllBookings);
router.get('/my', getMyBooking);
router.post('/', createBooking);
router.put('/:bookingId/cancel', authorize('ADMIN', 'STUDENT'), cancelBooking);

export default router;
