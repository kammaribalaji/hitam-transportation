import mongoose from 'mongoose';

const busLocationSchema = new mongoose.Schema(
  {
    driverRollNumber: { type: String, required: true, unique: true, index: true },
    routeId: { type: String, required: true, index: true },
    busNumber: { type: String, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: null },
    source: { type: String, enum: ['GPS', 'SIMULATED'], default: 'GPS' },
    lastPingAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Keep live location collection compact by expiring pings after 24 hours.
busLocationSchema.index({ lastPingAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export default mongoose.model('BusLocation', busLocationSchema);
