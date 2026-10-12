import { Router } from 'express';
import { getAllComplaints, createComplaint, updateComplaintStatus } from '../controllers/complaintController.js';
import { protect, authorize, requirePaidStudent } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', requirePaidStudent, getAllComplaints);
router.post('/', requirePaidStudent, createComplaint);
router.put('/:complaintId/status', authorize('ADMIN'), updateComplaintStatus);

export default router;
