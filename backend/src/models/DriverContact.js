import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    phone: { type: String, required: true },
    busNumber: { type: String, default: '' },
    subtitle: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('DriverContact', contactSchema);
