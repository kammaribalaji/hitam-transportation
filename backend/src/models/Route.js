import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    busNumber: { type: String, required: true },
    pickupPoint: { type: String, required: true },
    reportingTime: { type: String, required: true },
    feeAmount: { type: Number, default: 12000 },
    totalSeats: { type: Number, default: 40 },
    bookedSeats: { type: Number, default: 0 },
    stops: [{ type: String }],
    startPoint: { type: String, default: '' },
    endPoint: { type: String, default: 'HITAM Campus' },
    distance: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Route', routeSchema);
