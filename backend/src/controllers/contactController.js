import DriverContact from '../models/DriverContact.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await DriverContact.find().sort({ createdAt: 1 });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const contact = await DriverContact.create(req.body);
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const contact = await DriverContact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contact) throw new AppError('Contact not found', 404);
    res.json(contact);
  } catch (err) {
    next(err);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const contact = await DriverContact.findByIdAndDelete(req.params.id);
    if (!contact) throw new AppError('Contact not found', 404);
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    next(err);
  }
};
