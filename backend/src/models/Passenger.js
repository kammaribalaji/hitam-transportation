import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true },
    name: { type: String, required: true },
    dept: { type: String, default: '' },
    seatNo: { type: Number, required: true },
    pickup: { type: String, default: '' },
    feePaid: { type: Boolean, default: true },
    boarded: { type: Boolean, default: false },
    routeId: { type: String, default: 'R1' },
    tripDate: { type: String, default: '' },
    status: { type: String, enum: ['BOARDED', 'PENDING', 'ABSENT'], default: 'PENDING' },
    scannedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Passenger', passengerSchema);
