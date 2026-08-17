import { Router } from 'express';
import { getMyPass } from '../controllers/bookingController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/my', getMyPass);

export default router;
