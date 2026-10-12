import { Router } from 'express';
import {
  upsertMyLiveLocation,
  getLiveLocationByRoute,
  getLiveLocationByBus,
  getAllLiveLocations,
} from '../controllers/liveLocationController.js';
import { protect, authorize, requirePaidStudent } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.get('/all', authorize('STUDENT', 'DRIVER', 'ADMIN'), requirePaidStudent, getAllLiveLocations);
router.put('/my', authorize('DRIVER', 'ADMIN'), upsertMyLiveLocation);
router.get('/route/:routeId', authorize('STUDENT', 'DRIVER', 'ADMIN'), requirePaidStudent, getLiveLocationByRoute);
router.get('/bus/:busNumber', authorize('STUDENT', 'DRIVER', 'ADMIN'), requirePaidStudent, getLiveLocationByBus);

export default router;
