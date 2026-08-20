import prisma from '../lib/prisma.js';
import { serialize, serializeMany } from '../lib/serialize.js';

export const getPassengersByRoute = async (req, res, next) => {
  try {
    const { routeId, date } = req.query;
    const where = {};
    if (routeId) where.routeId = String(routeId);
    if (date) where.tripDate = date;
    const passengers = await prisma.passenger.findMany({ where, orderBy: { seatNo: 'asc' } });

    // Deduplicate by Name (Primary Uniqueness Key)
    const uniqueMap = new Map();
    for (const p of passengers) {
      const cleanName = p.name ? p.name.replace(/\s+/g, ' ').trim().toUpperCase() : p.rollNumber;
      if (!uniqueMap.has(cleanName)) {
        uniqueMap.set(cleanName, p);
      }
    }

    const uniquePassengers = Array.from(uniqueMap.values());
    res.json(serializeMany(uniquePassengers));
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { rollNumber, boarded } = req.body;
    const now = new Date();
    const existing = await prisma.passenger.findFirst({ where: { rollNumber: String(rollNumber) } });
    if (!existing) return res.json(null);

    const passenger = await prisma.passenger.update({
      where: { id: existing.id },
      data: {
        boarded: Boolean(boarded),
        status: boarded ? 'BOARDED' : 'PENDING',
        scannedAt: boarded ? now.toTimeString().slice(0, 5) : null,
      },
    });
    res.json(serialize(passenger));
  } catch (err) {
    next(err);
  }
};

export const scanQR = async (req, res, next) => {
  try {
    const { qrData } = req.body;
    // QR format: HITAM|rollNumber|busNumber|SEATn|STATUS
    // (STATUS may be PAID, PAID_1YR, PARTIAL, PARTIALLY PAID, UNPAID, PENDING)
    const parts = String(qrData || '').split('|');
    if (parts.length < 2 || !parts[1] || !parts[1].trim()) {
      return res.status(400).json({ message: 'Invalid QR data' });
    }
    const rollNumber = parts[1].trim();
    const seatMatch = /SEAT(\d+)/i.exec(parts[3] || '');
    const seatFromQr = seatMatch ? parseInt(seatMatch[1], 10) : null;
    const qrStatus = (parts[4] || '').trim();

    const passenger = await prisma.passenger.findFirst({ where: { rollNumber } });
    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found for this route' });
    }

    // Verify-only: the driver confirms boarding in the UI, which then calls
    // PUT /api/passengers/attendance. We never auto-mark here.
    res.json({
      passenger: serialize(passenger),
      qrStatus,
      seatFromQr,
      seatMismatch: seatFromQr !== null && seatFromQr !== passenger.seatNo,
    });
  } catch (err) {
    next(err);
  }
};
