import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    collegeName: { type: String, default: 'HITAM College' },
    transportIncharge: { type: String, default: 'Transport Office' },
    email: { type: String, default: 'transport@hitam.edu.in' },
    phone: { type: String, default: '+91 40 1234 5678' },
    address: { type: String, default: 'HITAM Campus, Hyderabad' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
