import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    time: { type: String, default: 'Just now' },
    isRead: { type: Boolean, default: false },
    type: { type: String, default: 'GENERAL' },
    targetRole: { type: String, default: 'ALL' },
    userId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
