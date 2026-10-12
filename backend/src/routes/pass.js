import { Router } from 'express';
import { getMyPass } from '../controllers/bookingController.js';
import { protect, requirePaidStudent } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/my', requirePaidStudent, getMyPass);

export default router;
