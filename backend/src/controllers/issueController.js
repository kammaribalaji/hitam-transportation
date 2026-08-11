import IssueReport from '../models/IssueReport.js';
import { AppError } from '../middlewares/errorHandler.js';

const generateIssueId = () => `ISS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

export const getAllIssues = async (req, res, next) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (severity) filter.severity = severity.toUpperCase();
    if (req.user.role === 'DRIVER') filter.driverRollNumber = req.user.rollNumber;
    const issues = await IssueReport.find(filter).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    next(err);
  }
};

export const createIssue = async (req, res, next) => {
  try {
    const { issueType, severity, description, photoUrl } = req.body;
    const issue = await IssueReport.create({
      issueId: generateIssueId(),
      driverRollNumber: req.user.rollNumber,
      issueType,
      severity: severity?.toUpperCase() || 'LOW',
      description,
      photoUrl: photoUrl || '',
      status: 'OPEN',
    });
    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
};

export const updateIssueStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const issue = await IssueReport.findOneAndUpdate(
      { issueId: req.params.issueId },
      { status: status.toUpperCase() },
      { new: true }
    );
    if (!issue) throw new AppError('Issue not found', 404);
    res.json(issue);
  } catch (err) {
    next(err);
  }
};
