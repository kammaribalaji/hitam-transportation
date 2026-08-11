import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    studentRollNumber: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    department: { type: String, default: '' },
    year: { type: String, default: '' },
    busNumber: { type: String, required: true },
    routeId: { type: String, required: true },
    routeName: { type: String, required: true },
    seatNumber: { type: Number, required: true },
    pickupPoint: { type: String, required: true },
    paymentStatus: { type: String, default: 'Pending' },
    paymentMethod: { type: String, default: '' },
    paymentDate: { type: String, default: '' },
    validTill: { type: String, default: '' },
    validityPeriod: { type: String, default: '' },
    qrCodeData: { type: String, required: true },
    bookingDate: { type: String, default: '' },
    amountPaid: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'], default: 'CONFIRMED' },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
