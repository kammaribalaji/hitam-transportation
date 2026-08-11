import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true },
    busType: { type: String, default: 'AC Seater' },
    capacity: { type: Number, default: 40 },
    driverId: { type: String, default: '' },
    driverName: { type: String, default: '' },
    routeId: { type: String, default: '' },
    routeName: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'OUT_OF_SERVICE'], default: 'ACTIVE' },
    fuelLevel: { type: Number, default: 75 },
    engineStatus: { type: String, default: 'Good' },
    batteryHealth: { type: String, default: 'Good' },
    tirePressure: { type: String, default: 'Good' },
    odometer: { type: Number, default: 45230 },
    lastService: { type: String, default: '15 Jan 2026' },
    model: { type: String, default: 'Ashok Leyland Viking' },
  },
  { timestamps: true }
);

export default mongoose.model('Bus', busSchema);
