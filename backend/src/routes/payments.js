import { Router } from 'express';
import {
  createPayment,
  initiatePayment,
  verifyPayment,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
  processPaymentWebhook,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

// Public webhook
router.post('/webhook', processPaymentWebhook);

// Protected endpoints
router.use(protect);

router.get('/', authorize('ADMIN'), getAllPayments);
router.get('/my', getMyPayments);
router.post('/', createPayment);
router.post('/initiate', initiatePayment);
router.post('/order', initiatePayment);
router.post('/verify', verifyPayment);
router.put('/:paymentId/status', authorize('ADMIN'), updatePaymentStatus);

export default router;
