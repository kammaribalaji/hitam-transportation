import Complaint from '../models/Complaint.js';
import { AppError } from '../middlewares/errorHandler.js';

const generateComplaintId = () => `CMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

export const getAllComplaints = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (req.user.role === 'STUDENT') filter.studentRollNumber = req.user.rollNumber;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Complaint.countDocuments(filter),
    ]);
    res.json({ complaints, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

export const createComplaint = async (req, res, next) => {
  try {
    const { category, description } = req.body;
    const now = new Date();
    const complaint = await Complaint.create({
      complaintId: generateComplaintId(),
      studentRollNumber: req.user.rollNumber,
      studentName: req.user.name,
      category: category || 'General',
      description,
      status: 'OPEN',
      date: now.toLocaleDateString('en-GB'),
    });
    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
};

export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findOneAndUpdate(
      { complaintId: req.params.complaintId },
      { status: status.toUpperCase() },
      { new: true }
    );
    if (!complaint) throw new AppError('Complaint not found', 404);
    res.json(complaint);
  } catch (err) {
    next(err);
  }
};
