import { Router } from 'express';
import { getPassengersByRoute, markAttendance, scanQR } from '../controllers/passengerController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getPassengersByRoute);
router.put('/attendance', authorize('DRIVER', 'ADMIN'), markAttendance);
router.post('/scan-qr', authorize('DRIVER', 'ADMIN'), scanQR);

export default router;
