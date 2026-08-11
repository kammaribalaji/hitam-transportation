import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true, unique: true },
    routeId: { type: String, required: true },
    routeName: { type: String, default: '' },
    driverRollNumber: { type: String, default: '' },
    busNumber: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    studentCount: { type: Number, default: 0 },
    status: { type: String, enum: ['UPCOMING', 'IN_PROGRESS', 'COMPLETED'], default: 'UPCOMING' },
    date: { type: String, default: '' },
    distance: { type: String, default: '' },
    fuelUsed: { type: String, default: '' },
    fuelCost: { type: String, default: '' },
    avgMileage: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Trip', tripSchema);
