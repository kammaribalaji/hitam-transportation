import { Router } from 'express';
import { createPayment, getMyPayments, getAllPayments, updatePaymentStatus } from '../controllers/paymentController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN'), getAllPayments);
router.get('/my', getMyPayments);
router.post('/', createPayment);
router.put('/:paymentId/status', authorize('ADMIN'), updatePaymentStatus);

export default router;
