import { Router } from 'express';
import { getNotifications, markAllRead, createNotification } from '../controllers/notificationController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/mark-all-read', markAllRead);
router.post('/', authorize('ADMIN'), createNotification);

export default router;
