import { Router } from 'express';
import { getAllStudents, getStudentByRoll, getStudentMe } from '../controllers/studentController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN', 'DRIVER'), getAllStudents);
router.get('/me', getStudentMe);
router.get('/:rollNo', authorize('ADMIN', 'DRIVER', 'STUDENT'), getStudentByRoll);

export default router;
