import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const CONTACT_FIELDS = {
  name: (v) => String(v),
  role: (v) => String(v),
  phone: (v) => String(v),
  busNumber: (v) => String(v),
  subtitle: (v) => String(v),
};

const buildContactData = (body, extra = {}) => {
  const data = { ...extra };
  for (const [key, coerce] of Object.entries(CONTACT_FIELDS)) {
    if (body[key] !== undefined) data[key] = coerce(body[key]);
  }
  return data;
};

export const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await prisma.driverContact.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(serializeMany(contacts));
  } catch (err) {
    next(err);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const contact = await prisma.driverContact.create({ data: buildContactData(req.body) });
    res.status(201).json(serialize(contact));
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const existing = await prisma.driverContact.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Contact not found', 404);
    const contact = await prisma.driverContact.update({
      where: { id: existing.id },
      data: buildContactData(req.body),
    });
    res.json(serialize(contact));
  } catch (err) {
    next(err);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const existing = await prisma.driverContact.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError('Contact not found', 404);
    await prisma.driverContact.delete({ where: { id: existing.id } });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    next(err);
  }
};
