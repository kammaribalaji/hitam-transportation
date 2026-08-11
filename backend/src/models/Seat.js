import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema(
  {
    routeId: { type: String, required: true, index: true },
    seatId: { type: Number, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'BOOKED', 'SELECTED', 'RESERVED'],
      default: 'AVAILABLE',
    },
  },
  { timestamps: true }
);

seatSchema.index({ routeId: 1, seatId: 1 }, { unique: true });

export default mongoose.model('Seat', seatSchema);
