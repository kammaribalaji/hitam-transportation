import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const generateComplaintId = () => `CMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

export const getAllComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (req.user.role === 'STUDENT') where.studentRollNumber = req.user.rollNumber;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.complaint.count({ where }),
    ]);
    res.json({ complaints: serializeMany(complaints), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const createComplaint = async (req, res, next) => {
  try {
    const { category, description } = req.body;
    const now = new Date();
    const complaint = await prisma.complaint.create({
      data: {
        complaintId: generateComplaintId(),
        studentRollNumber: req.user.rollNumber,
        studentName: req.user.name,
        category: category || 'General',
        description: String(description || ''),
        status: 'OPEN',
        date: now.toLocaleDateString('en-GB'),
      },
    });
    res.status(201).json(serialize(complaint));
  } catch (err) {
    next(err);
  }
};

export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.complaint.findUnique({ where: { complaintId: String(req.params.complaintId) } });
    if (!existing) throw new AppError('Complaint not found', 404);
    const complaint = await prisma.complaint.update({
      where: { id: existing.id },
      data: { status: String(status).toUpperCase() },
    });
    res.json(serialize(complaint));
  } catch (err) {
    next(err);
  }
};
