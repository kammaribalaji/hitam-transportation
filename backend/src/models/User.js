import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    department: { type: String, default: '' },
    year: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['STUDENT', 'DRIVER', 'ADMIN'], default: 'STUDENT' },
    assignedRouteId: { type: String, default: 'R1' },
    transportFeePaid: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    licenseNo: { type: String, default: '' },
    address: { type: String, default: '' },
    experience: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    assignedBusNumber: { type: String, default: '' },
    avatarInitial: { type: String, default: 'U' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
