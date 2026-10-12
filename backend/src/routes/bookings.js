import { Router } from 'express';
import { getAllBookings, getMyBooking, createBooking, cancelBooking, deleteBooking } from '../controllers/bookingController.js';
import { protect, authorize, requireApprovedStudent } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(requireApprovedStudent);

router.get('/', authorize('ADMIN', 'DRIVER'), getAllBookings);
router.get('/my', getMyBooking);
router.post('/', createBooking);
router.put('/:bookingId/cancel', authorize('ADMIN', 'STUDENT'), cancelBooking);
router.delete('/:bookingId', authorize('ADMIN', 'STUDENT'), deleteBooking);

export default router;
