import { Router } from 'express';
import { getAllUsers, getUserByRoll, createUser, updateUser, deleteUser, updateProfile } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', authorize('ADMIN'), getAllUsers);
router.post('/', authorize('ADMIN'), createUser);
router.get('/profile', updateProfile); // GET profile handled by auth/me
router.put('/profile', updateProfile);
router.get('/:rollNumber', authorize('ADMIN', 'DRIVER'), getUserByRoll);
router.put('/:rollNumber', authorize('ADMIN'), updateUser);
router.delete('/:rollNumber', authorize('ADMIN'), deleteUser);

export default router;
