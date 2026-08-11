import { Router } from 'express';
import { getAllContacts, createContact, updateContact, deleteContact } from '../controllers/contactController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', getAllContacts);
router.post('/', authorize('ADMIN'), createContact);
router.put('/:id', authorize('ADMIN'), updateContact);
router.delete('/:id', authorize('ADMIN'), deleteContact);

export default router;
