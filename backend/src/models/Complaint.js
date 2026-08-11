import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true },
    studentRollNumber: { type: String, default: '' },
    studentName: { type: String, default: '' },
    category: { type: String, default: 'General' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
    date: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Complaint', complaintSchema);
