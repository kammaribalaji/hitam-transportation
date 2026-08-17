import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { ROUTE_12, PASSENGERS } from './route12-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hash(pw, 10);
const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Payment status is DERIVED from the actual Amount / Paid / Balance values.
//   amount - paid <= 0 -> PAID | paid > 0 -> PARTIALLY PAID | else UNPAID
const deriveStatus = (amount, paid) => {
  const amt = Number(amount) || 0;
  const pd = Number(paid) || 0;
  if (amt - pd <= 0) return 'PAID';
  if (pd > 0) return 'PARTIALLY PAID';
  return 'UNPAID';
};
const displayStatus = (s) =>
  s === 'PAID' ? 'Paid (Annual Pass)' : s === 'PARTIALLY PAID' ? 'Partially Paid' : 'Pending';

// Only real records from the sheet are imported (must have Roll No + Name).
const RECORDS = PASSENGERS.filter(
  (r) => r && r.rollNo && String(r.rollNo).trim() && r.name && String(r.name).trim()
);

// Seat numbers come straight from the sheet. The sheet assigns seat 31 to TWO
// students and puts VEMU ABHISHEK on WAITLIST1 (no physical seat), so:
//   - physical seats BOOKED = the set of real seat numbers (40 unique seats)
//   - waitlist is stored as seat 0 internally (schema uses integers)
const BOOKED_SEAT_IDS = new Set(
  RECORDS.map((r) => (typeof r.seatNo === 'number' && r.seatNo >= 1 ? r.seatNo : null)).filter(Boolean)
);
const seatLabelOf = (r) =>
  typeof r.seatNo === 'number' && r.seatNo >= 1 ? r.seatNo : 'WAITLIST1';

async function seed() {
  console.log('Seeding PostgreSQL database...');
  console.log(`Route 12 sheet records to import: ${RECORDS.length}`);

  await prisma.$transaction([
    prisma.user.deleteMany(),
    prisma.gpsDevice.deleteMany(),
    prisma.route.deleteMany(),
    prisma.bus.deleteMany(),
    prisma.driverContact.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.passenger.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.issueReport.deleteMany(),
    prisma.busLocation.deleteMany(),
    prisma.settings.deleteMany(),
  ]);

  const now = new Date();
  const todayStr = fmt(now);
  const validTill = fmt(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));
  const passwordHash = await hash('hitam123');

  // ---------------- Route 12 + stops ----------------
  const route = await prisma.route.create({
    data: {
      id: ROUTE_12.id,
      name: ROUTE_12.name,
      busNumber: ROUTE_12.busNumber,
      pickupPoint: ROUTE_12.pickupPoint,
      reportingTime: ROUTE_12.reportingTime,
      totalSeats: ROUTE_12.capacity,
      bookedSeats: RECORDS.length,
      feeAmount: ROUTE_12.feeAmount,
      stops: ROUTE_12.stops.map((s) => s.name),
      startPoint: ROUTE_12.startPoint,
      endPoint: ROUTE_12.endPoint,
      distance: ROUTE_12.distance,
      isActive: true,
    },
  });

  await prisma.routeStop.createMany({
    data: ROUTE_12.stops.map((s, i) => ({
      routeId: route.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      stopTime: s.stopTime,
      stopOrder: i + 1,
    })),
  });

  // ---------------- Bus (capacity 50) ----------------
  await prisma.bus.create({
    data: {
      busNumber: ROUTE_12.busNumber,
      busType: ROUTE_12.busType,
      capacity: ROUTE_12.capacity,
      driverId: ROUTE_12.driver.rollNumber,
      driverName: ROUTE_12.driver.name,
      routeId: ROUTE_12.id,
      routeName: 'Route 12',
      status: 'ACTIVE',
      fuelLevel: 75,
      engineStatus: 'Good',
      batteryHealth: 'Good',
      tirePressure: 'Good',
      odometer: 45230,
      lastService: '15 Jan 2026',
      model: 'Ashok Leyland Viking',
    },
  });

  // ---------------- HypeGPS device mapping (Route 12 -> device 1368) ----------------
  await prisma.gpsDevice.createMany({
    data: [
      {
        deviceId: ROUTE_12.gpsDeviceId,
        busNumber: ROUTE_12.busNumber,
        routeId: ROUTE_12.id,
      },
    ],
  });

  // ---------------- Users: driver + admin + sheet records ----------------
  const users = [
    {
      rollNumber: ROUTE_12.driver.rollNumber,
      name: ROUTE_12.driver.name,
      phone: ROUTE_12.driver.phone,
      email: ROUTE_12.driver.email,
      role: 'DRIVER',
      assignedRouteId: ROUTE_12.id,
      assignedBusNumber: ROUTE_12.busNumber,
      licenseNo: ROUTE_12.driver.licenseNo,
      experience: ROUTE_12.driver.experience,
      emergencyContact: ROUTE_12.driver.emergencyContact,
      avatarInitial: 'R',
      passwordHash,
    },
    {
      rollNumber: 'ADMIN001',
      name: 'Admin User',
      email: 'admin@hitam.edu.in',
      phone: '+91 40 1234 5678',
      role: 'ADMIN',
      avatarInitial: 'A',
      passwordHash,
    },
  ];

  for (const r of RECORDS) {
    const status = deriveStatus(r.amount, r.paid);
    users.push({
      rollNumber: String(r.rollNo).trim(),
      name: String(r.name).trim(),
      department: r.year || '',
      year: r.year || '',
      role: r.role === 'STAFF' ? 'STAFF' : 'STUDENT',
      assignedRouteId: ROUTE_12.id,
      boardingPoint: r.boardingPoint || '',
      feeAmount: Number(r.amount) || 0,
      feePaidAmount: Number(r.paid) || 0,
      feeBalance: Number(r.balance) || 0,
      transportFeePaid: status === 'PAID',
      avatarInitial: String(r.name).trim()[0] || 'S',
      passwordHash,
    });
  }
  await prisma.user.createMany({ data: users });

  // ---------------- Seats 1..50 (BOOKED exactly where the sheet assigned a seat) --------
  for (let seatId = 1; seatId <= ROUTE_12.capacity; seatId += 1) {
    await prisma.seat.create({
      data: {
        routeId: ROUTE_12.id,
        seatId,
        status: BOOKED_SEAT_IDS.has(seatId) ? 'BOOKED' : 'AVAILABLE',
      },
    });
  }

  // ---------------- Bookings + Payments + Passengers + seat notifications ----------------
  for (let i = 0; i < RECORDS.length; i += 1) {
    const r = RECORDS[i];
    const status = deriveStatus(r.amount, r.paid);
    const seatNumber = typeof r.seatNo === 'number' && r.seatNo >= 1 ? r.seatNo : 0; // WAITLIST1 -> 0
    const seatLabel = seatLabelOf(r);
    const bookingId = `HITAM-PASS-2026-${String(1001 + i)}`;
    const paid = status === 'PAID';
    const paidDisplay = displayStatus(status);

    await prisma.booking.create({
      data: {
        bookingId,
        tripId: 'TRIP-001',
        studentRollNumber: String(r.rollNo).trim(),
        studentName: String(r.name).trim(),
        department: r.year || '',
        year: r.year || '',
        busNumber: ROUTE_12.busNumber,
        routeId: ROUTE_12.id,
        routeName: route.name,
        seatNumber,
        pickupPoint: r.boardingPoint || '',
        paymentStatus: paidDisplay,
        paymentMethod: paid ? 'UPI' : '',
        paymentDate: paid ? todayStr : '',
        validTill: paid ? validTill : '',
        validityPeriod: paid ? `Valid for 1 Year (${todayStr} - ${validTill})` : '',
        qrCodeData: `HITAM|${String(r.rollNo).trim()}|${ROUTE_12.busNumber}|SEAT${seatLabel}|${status}`,
        bookingDate: todayStr,
        amountPaid: Number(r.paid) || 0,
        isActive: true,
        status: 'CONFIRMED',
      },
    });

    await prisma.payment.create({
      data: {
        paymentId: `PAY-2026-${String(5001 + i)}`,
        studentRollNumber: String(r.rollNo).trim(),
        studentName: String(r.name).trim(),
        routeId: ROUTE_12.id,
        bookingId,
        amount: Number(r.paid) || 0,
        method: 'UPI',
        status: paid ? 'PAID' : 'PENDING',
        transactionRef: paid ? `TXN${90000000 + i * 137}` : '',
        date: paid ? todayStr : '',
        validTill: paid ? validTill : '',
      },
    });

    await prisma.passenger.create({
      data: {
        rollNumber: String(r.rollNo).trim(),
        name: String(r.name).trim(),
        dept: r.year || '',
        seatNo: seatNumber,
        pickup: r.boardingPoint || '',
        feePaid: paid,
        boarded: false,
        routeId: ROUTE_12.id,
        tripDate: todayStr,
        status: 'PENDING',
      },
    });

    await prisma.notification.create({
      data: {
        title: seatNumber >= 1 ? (paid ? 'Seat Confirmed' : 'Seat Reserved') : 'Waitlisted',
        message: seatNumber >= 1
          ? paid
            ? `Your seat #${seatLabel} on Route 12 is confirmed.`
            : `Your seat #${seatLabel} on Route 12 is reserved. Complete your transport fee payment.`
          : 'You are on the Route 12 waitlist. A seat will be assigned when one becomes available.',
        time: 'Just now',
        isRead: false,
        type: 'SEAT',
        targetRole: 'STUDENT',
        userId: String(r.rollNo).trim(),
      },
    });
  }

  // ---------------- Trips ----------------
  const d1 = new Date(now); d1.setDate(d1.getDate() - 1);
  const d2 = new Date(now); d2.setDate(d2.getDate() - 2);
  await prisma.trip.createMany({
    data: [
      { tripId: 'TRIP-001', routeId: ROUTE_12.id, routeName: ROUTE_12.name, driverRollNumber: ROUTE_12.driver.rollNumber, busNumber: ROUTE_12.busNumber, startTime: '06:40 AM', endTime: '08:45 AM', studentCount: RECORDS.length, status: 'UPCOMING', date: todayStr, distance: ROUTE_12.distance },
      { tripId: 'TRIP-002', routeId: ROUTE_12.id, routeName: ROUTE_12.name, driverRollNumber: ROUTE_12.driver.rollNumber, busNumber: ROUTE_12.busNumber, startTime: '06:40 AM', endTime: '08:42 AM', studentCount: RECORDS.length, status: 'COMPLETED', date: fmt(d1), distance: ROUTE_12.distance, fuelUsed: '8L', fuelCost: '₹740', avgMileage: '4.3 km/L' },
      { tripId: 'TRIP-003', routeId: ROUTE_12.id, routeName: ROUTE_12.name, driverRollNumber: ROUTE_12.driver.rollNumber, busNumber: ROUTE_12.busNumber, startTime: '06:40 AM', endTime: '08:48 AM', studentCount: RECORDS.length, status: 'COMPLETED', date: fmt(d2), distance: ROUTE_12.distance, fuelUsed: '8.4L', fuelCost: '₹776', avgMileage: '4.1 km/L' },
    ],
  });

  // ---------------- Initial live location (at first stop) ----------------
  await prisma.busLocation.create({
    data: {
      driverRollNumber: ROUTE_12.driver.rollNumber,
      routeId: ROUTE_12.id,
      busNumber: ROUTE_12.busNumber,
      latitude: ROUTE_12.stops[0].latitude,
      longitude: ROUTE_12.stops[0].longitude,
      speed: 0,
      source: 'SIMULATED',
      lastPingAt: now,
    },
  });

  // ---------------- Generic notifications ----------------
  await prisma.notification.createMany({
    data: [
      { title: 'Campus Transport Notice', message: 'All evening return buses will leave campus at 04:45 PM starting next week.', time: 'Just now', isRead: false, type: 'ANNOUNCEMENT', targetRole: 'ALL' },
      { title: 'Route 12 Timings Update', message: 'Route 12 buses now depart Sangareddy Old Bus Stand at 06:40 AM sharp.', time: '1 hour ago', isRead: false, type: 'ANNOUNCEMENT', targetRole: 'ALL' },
    ],
  });

  // ---------------- Contacts ----------------
  await prisma.driverContact.createMany({
    data: [
      { name: 'Raju', role: 'Bus Driver', phone: '9490717770', busNumber: ROUTE_12.busNumber, subtitle: 'Route 12 Lead Driver' },
      { name: 'Anil Verma', role: 'Bus In-charge', phone: '+91 91234 56789', busNumber: ROUTE_12.busNumber, subtitle: 'Faculty Transport Coordinator' },
      { name: 'Office Helpline', role: 'Transport Office', phone: '+91 40 1234 5678', busNumber: 'HITAM Campus', subtitle: 'Available 6:00 AM - 10:00 PM' },
      { name: '24x7 Emergency Support', role: 'HITAM Security', phone: '+91 90000 11222', busNumber: 'All Routes', subtitle: 'Emergency Hotline' },
    ],
  });

  // ---------------- Settings ----------------
  await prisma.settings.create({ data: { transportIncharge: ROUTE_12.facultyIncharge } });

  const available = ROUTE_12.capacity - BOOKED_SEAT_IDS.size;
  console.log('Database seeded successfully!');
  console.log(`Route 12: ${ROUTE_12.stops.length} stops · Bus capacity ${ROUTE_12.capacity} · fee ₹${ROUTE_12.feeAmount}`);
  console.log(`Passengers: ${RECORDS.length} (${RECORDS.filter((r) => r.role === 'STAFF').length} staff, ${RECORDS.filter((r) => r.role === 'STUDENT').length} students) · ${BOOKED_SEAT_IDS.size} physical seats occupied · ${available} seats free`);
  console.log(`Faculty Incharge: ${ROUTE_12.facultyIncharge} · Driver: ${ROUTE_12.driver.name} (${ROUTE_12.driver.phone}) · Admin: ADMIN001 · password: hitam123`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
