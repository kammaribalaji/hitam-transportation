import { Router } from 'express';
import {
  getHypegpsStatus,
  getMappings,
  createMapping,
  updateMapping,
  deleteMapping,
} from '../controllers/hypegpsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/devices', getHypegpsStatus);
router.get('/mappings', getMappings);
router.post('/mappings', createMapping);
router.put('/mappings/:id', updateMapping);
router.delete('/mappings/:id', deleteMapping);

export default router;
