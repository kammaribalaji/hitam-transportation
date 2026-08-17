import { Router } from 'express';
import { importRoute12 } from '../controllers/importController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.post('/route12', authorize('ADMIN'), importRoute12);

export default router;
