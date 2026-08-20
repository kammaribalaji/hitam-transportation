import { Router } from 'express';
import {
  upsertMyLiveLocation,
  getLiveLocationByRoute,
  getLiveLocationByBus,
  getAllLiveLocations,
} from '../controllers/liveLocationController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.get('/all', authorize('STUDENT', 'DRIVER', 'ADMIN'), getAllLiveLocations);
router.put('/my', authorize('DRIVER', 'ADMIN'), upsertMyLiveLocation);
router.get('/route/:routeId', authorize('STUDENT', 'DRIVER', 'ADMIN'), getLiveLocationByRoute);
router.get('/bus/:busNumber', authorize('STUDENT', 'DRIVER', 'ADMIN'), getLiveLocationByBus);

export default router;
