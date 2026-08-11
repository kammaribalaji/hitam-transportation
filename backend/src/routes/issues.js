import { Router } from 'express';
import { getAllIssues, createIssue, updateIssueStatus } from '../controllers/issueController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAllIssues);
router.post('/', authorize('DRIVER'), createIssue);
router.put('/:issueId/status', authorize('ADMIN'), updateIssueStatus);

export default router;
