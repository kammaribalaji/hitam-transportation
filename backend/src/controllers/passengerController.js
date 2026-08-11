import Passenger from '../models/Passenger.js';

export const getPassengersByRoute = async (req, res, next) => {
  try {
    const { routeId, date } = req.query;
    const filter = {};
    if (routeId) filter.routeId = routeId;
    if (date) filter.tripDate = date;
    const passengers = await Passenger.find(filter).sort({ seatNo: 1 });
    res.json(passengers);
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { rollNumber, boarded } = req.body;
    const now = new Date();
    const passenger = await Passenger.findOneAndUpdate(
      { rollNumber },
      {
        boarded,
        status: boarded ? 'BOARDED' : 'PENDING',
        scannedAt: boarded ? now.toTimeString().slice(0, 5) : null,
      },
      { new: true }
    );
    res.json(passenger);
  } catch (err) {
    next(err);
  }
};

export const scanQR = async (req, res, next) => {
  try {
    const { qrData } = req.body;
    // QR format: HITAM|rollNumber|busNumber|SEATx|PAID_1YR
    const parts = qrData?.split('|');
    if (!parts || parts.length < 2) {
      return res.status(400).json({ message: 'Invalid QR data' });
    }
    const rollNumber = parts[1];
    const now = new Date();

    const passenger = await Passenger.findOneAndUpdate(
      { rollNumber },
      { boarded: true, status: 'BOARDED', scannedAt: now.toTimeString().slice(0, 5) },
      { new: true }
    );

    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found for this route' });
    }

    res.json({ message: 'Attendance marked', passenger });
  } catch (err) {
    next(err);
  }
};
