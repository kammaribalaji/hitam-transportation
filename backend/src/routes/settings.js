import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('ADMIN'), updateSettings);

export default router;
