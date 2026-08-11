import mongoose from 'mongoose';

const issueReportSchema = new mongoose.Schema(
  {
    issueId: { type: String, required: true, unique: true },
    driverRollNumber: { type: String, default: '' },
    issueType: { type: String, default: '' },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
    photoUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('IssueReport', issueReportSchema);
