import { Router } from 'express';
import { protectFast } from '../middlewares/auth.js';
import { 
  searchStops, 
  searchBuses, 
  findBusesBetweenStops, 
  getBusDetails, 
  findBusesByStop,
  getDestinations,
  getPopularRoutes,
  searchBusesBetween
} from '../controllers/whereIsMyBusController.js';

const router = Router();

router.use(protectFast);

router.get('/stops/search', searchStops);
router.get('/stops/destinations', getDestinations);
router.get('/routes/popular', getPopularRoutes);
router.get('/buses/search', searchBuses);
router.get('/buses/between', findBusesBetweenStops);
router.get('/buses/search-between', searchBusesBetween);
router.get('/buses/stop', findBusesByStop);
router.get('/buses/:busId', getBusDetails);

export default router;
