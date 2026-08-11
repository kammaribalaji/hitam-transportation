import { Router } from 'express';
import { getDashboardAnalytics, getRevenueChart } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/dashboard', authorize('ADMIN'), getDashboardAnalytics);
router.get('/revenue', authorize('ADMIN'), getRevenueChart);

export default router;
