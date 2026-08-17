import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serialize, serializeMany } from '../lib/serialize.js';

const generateIssueId = () => `ISS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

export const getAllIssues = async (req, res, next) => {
  try {
    const { status, severity } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (severity) where.severity = severity.toUpperCase();
    if (req.user.role === 'DRIVER') where.driverRollNumber = req.user.rollNumber;
    const issues = await prisma.issueReport.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(serializeMany(issues));
  } catch (err) {
    next(err);
  }
};

export const createIssue = async (req, res, next) => {
  try {
    const { issueType, severity, description, photoUrl } = req.body;
    const issue = await prisma.issueReport.create({
      data: {
        issueId: generateIssueId(),
        driverRollNumber: req.user.rollNumber,
        issueType: String(issueType || ''),
        severity: severity?.toUpperCase() || 'LOW',
        description: String(description || ''),
        photoUrl: photoUrl || '',
        status: 'OPEN',
      },
    });
    res.status(201).json(serialize(issue));
  } catch (err) {
    next(err);
  }
};

export const updateIssueStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await prisma.issueReport.findUnique({ where: { issueId: String(req.params.issueId) } });
    if (!existing) throw new AppError('Issue not found', 404);
    const issue = await prisma.issueReport.update({
      where: { id: existing.id },
      data: { status: String(status).toUpperCase() },
    });
    res.json(serialize(issue));
  } catch (err) {
    next(err);
  }
};
