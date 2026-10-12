import { Router } from 'express';
import {
  getPublicRoutesAndStops,
  submitApplication,
  getApplicationStatusPublic,
  getApplicationsSummary,
  getAllApplications,
  getApplicationById,
  updateApplicationReviewStatus,
  approveApplication,
  rejectApplication,
  activateApplicantAccount,
  getMyApplication,
  getMyApplicationStatus,
} from '../controllers/transportApplicationController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

// Public endpoints
router.get('/meta', getPublicRoutesAndStops);
router.post('/', submitApplication);
router.get('/track/:applicationNo', getApplicationStatusPublic);

// Authenticated student endpoints
router.get('/status', protect, getMyApplicationStatus);
router.get('/my', protect, getMyApplication);

// Admin endpoints
router.get('/summary', protect, authorize('ADMIN'), getApplicationsSummary);
router.get('/', protect, authorize('ADMIN'), getAllApplications);
router.get('/:id', protect, authorize('ADMIN'), getApplicationById);
router.patch('/:id/status', protect, authorize('ADMIN'), updateApplicationReviewStatus);
router.post('/:id/approve', protect, authorize('ADMIN'), approveApplication);
router.post('/:id/reject', protect, authorize('ADMIN'), rejectApplication);
router.post('/:id/activate-account', protect, authorize('ADMIN'), activateApplicantAccount);

export default router;
