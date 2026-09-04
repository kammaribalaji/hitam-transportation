import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING HITAM TRANSPORT PRODUCTION DATABASE (NEON DB) ===');

  const masterDbPath = path.resolve(__dirname, '../src/data/master_transport_database.json');
  if (!fs.existsSync(masterDbPath)) {
    throw new Error(`Master database file not found at ${masterDbPath}`);
  }

  const masterDb = JSON.parse(fs.readFileSync(masterDbPath, 'utf8'));
  const defaultPasswordHash = await bcrypt.hash('hitam123', 10);
  const studentPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Clean old records
  console.log('Clearing existing tables...');
  await prisma.stopDepartureLog.deleteMany({}).catch(() => {});
  await prisma.passenger.deleteMany({}).catch(() => {});
  await prisma.booking.deleteMany({}).catch(() => {});
  await prisma.routeStop.deleteMany({}).catch(() => {});
  await prisma.route.deleteMany({}).catch(() => {});
  await prisma.gpsDevice.deleteMany({}).catch(() => {});
  await prisma.driverContact.deleteMany({}).catch(() => {});
  await prisma.user.deleteMany({}).catch(() => {});

  // 2. Prepare Users Map to deduplicate rollNumbers
  const userMap = new Map();

  // Admin
  userMap.set('ADMIN001', {
    rollNumber: 'ADMIN001',
    name: 'Transport Administrator',
    email: 'admin@hitam.edu.in',
    phone: '+91 9490717770',
    role: 'ADMIN',
    department: 'TRANSPORT',
    year: 'N/A',
    passwordHash: defaultPasswordHash,
    assignedRouteId: '1',
    assignedBusNumber: 'TS 09 UB 1201',
    transportFeePaid: true,
  });

  // Drivers
  for (const r of masterDb.routes) {
    const routeId = String(r.id);
    const busNumber = r.busNumber || `TS 09 UB ${1200 + parseInt(routeId)}`;
    const driverRoll = `DRV${routeId.padStart(3, '0')}`;

    userMap.set(driverRoll, {
      rollNumber: driverRoll,
      name: r.driverName || `Driver Route ${routeId}`,
      email: `driver${routeId}@hitam.edu.in`,
      phone: r.driverPhone || '',
      role: 'DRIVER',
      assignedRouteId: routeId,
      assignedBusNumber: busNumber,
      department: 'TRANSPORT',
      year: 'N/A',
      passwordHash: defaultPasswordHash,
      transportFeePaid: true,
    });
  }

  // Master Students (base directory)
  for (const s of (masterDb.master_students || [])) {
    const roll = s.rollNumber?.trim().toUpperCase();
    if (!roll) continue;

    userMap.set(roll, {
      rollNumber: roll,
      name: s.name?.trim().toUpperCase() || roll,
      email: `${roll.toLowerCase()}@hitam.edu.in`,
      phone: '',
      role: 'STUDENT',
      department: 'CSE',
      year: s.year || '2nd Year',
      passwordHash: studentPasswordHash,
      assignedRouteId: '',
      assignedBusNumber: '',
      transportFeePaid: false,
    });
  }

  // Passengers & Staff (exact enrolled transport data with fee status)
  for (const p of masterDb.passengers) {
    const roll = p.rollNumber?.trim().toUpperCase();
    if (!roll) continue;
    const cleanName = p.name?.replace(/\s+/g, ' ').trim().toUpperCase() || roll;
    const routeId = String(p.routeId);
    const isStaff = p.isStaff || roll.startsWith('HTM');
    const busNumber = `TS 09 UB ${1200 + parseInt(routeId)}`;
    const feeAmount = Number(p.amount ?? p.feeAmount ?? 42900);
    const feePaid = Number(p.paid ?? p.feePaidAmount ?? 42900);
    const feeBal = Number(p.balance ?? p.feeBalance ?? 0);

    userMap.set(roll, {
      rollNumber: roll,
      name: cleanName,
      email: `${roll.toLowerCase()}@hitam.edu.in`,
      phone: '',
      role: isStaff ? 'STAFF' : 'STUDENT',
      assignedRouteId: routeId,
      boardingPoint: p.boardingPoint || '',
      feeAmount,
      feePaidAmount: feePaid,
      feeBalance: feeBal,
      transportFeePaid: feePaid > 0,
      department: isStaff ? 'FACULTY' : 'B.Tech',
      year: p.year || '2nd Year',
      assignedBusNumber: busNumber,
      passwordHash: studentPasswordHash,
    });
  }

  // Insert Users in batches of 500
  console.log(`Inserting ${userMap.size} Users in bulk...`);
  const allUsers = Array.from(userMap.values());
  for (let i = 0; i < allUsers.length; i += 500) {
    await prisma.user.createMany({
      data: allUsers.slice(i, i + 500),
      skipDuplicates: true,
    });
  }

  // 3. Seed Routes, Stops, DriverContacts, GpsDevices
  console.log(`Seeding ${masterDb.routes.length} Routes & Stops...`);
  const allStops = [];
  const allContacts = [];
  const allGpsDevices = [];

  for (const r of masterDb.routes) {
    const routeId = String(r.id);
    const busNumber = r.busNumber || `TS 09 UB ${1200 + parseInt(routeId)}`;

    await prisma.route.create({
      data: {
        id: routeId,
        name: r.name,
        busNumber,
        pickupPoint: r.startPoint,
        reportingTime: r.reportingTime || '07:00 AM',
        startPoint: r.startPoint,
        endPoint: 'HITAM College',
        feeAmount: 42900,
        totalSeats: 50,
        bookedSeats: 40,
        stops: r.stops.map((s) => s.name),
        distance: '32 km',
        isActive: true,
      },
    });

    for (let idx = 0; idx < r.stops.length; idx++) {
      const s = r.stops[idx];
      allStops.push({
        routeId,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        stopTime: s.stopTime || '',
        stopOrder: idx + 1,
      });
    }

    allContacts.push({
      name: r.driverName || `Driver Route ${routeId}`,
      role: 'Driver',
      phone: r.driverPhone || '9490717770',
      busNumber,
      subtitle: `Route ${routeId} Driver • ${r.startPoint}`,
    });

    const deviceId = String(1356 + parseInt(routeId));
    allGpsDevices.push({
      routeId,
      deviceId,
      busNumber,
    });
  }

  console.log(`Inserting ${allStops.length} Stops in bulk...`);
  await prisma.routeStop.createMany({ data: allStops });

  console.log(`Inserting ${allContacts.length} Driver Contacts...`);
  await prisma.driverContact.createMany({ data: allContacts });

  console.log(`Inserting ${allGpsDevices.length} GPS Devices...`);
  await prisma.gpsDevice.createMany({ data: allGpsDevices, skipDuplicates: true });

  // 4. Seed Bookings & Passengers in bulk
  console.log(`Seeding ${masterDb.passengers.length} Bookings & Passengers in bulk...`);
  const allBookings = [];
  const allPassengers = [];

  let idx = 0;
  for (const p of masterDb.passengers) {
    idx++;
    const roll = p.rollNumber?.trim().toUpperCase();
    const cleanName = p.name?.replace(/\s+/g, ' ').trim().toUpperCase();
    const routeId = String(p.routeId);
    const busNumber = `TS 09 UB ${1200 + parseInt(routeId)}`;
    const feePaid = Number(p.paid ?? p.feePaidAmount ?? 42900);
    const feeBal = Number(p.balance ?? p.feeBalance ?? 0);
    const isPaid = feeBal <= 0 && feePaid > 0;
    const isPartial = feeBal > 0 && feePaid > 0;
    const seatNum = parseInt(p.seatNumber) || 0;

    allBookings.push({
      bookingId: `BK-R${routeId}-${String(idx).padStart(4, '0')}`,
      tripId: `TRIP-R${routeId}`,
      studentRollNumber: roll,
      studentName: cleanName,
      department: 'CSE',
      year: p.year || '2nd Year',
      busNumber,
      routeId,
      routeName: `Route ${routeId}`,
      seatNumber: seatNum,
      pickupPoint: p.boardingPoint || '',
      paymentStatus: isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING',
      paymentMethod: 'UPI / Online',
      qrCodeData: `HITAM-BUS-PASS|${roll}|R${routeId}|${busNumber}|SEAT-${seatNum}|${p.boardingPoint}`,
      bookingDate: p.date || '2026-08-12',
      amountPaid: feePaid,
      isActive: true,
      status: 'CONFIRMED',
    });

    allPassengers.push({
      rollNumber: roll,
      name: cleanName,
      dept: 'CSE',
      seatNo: seatNum,
      pickup: p.boardingPoint || '',
      feePaid: isPaid,
      boarded: idx % 3 === 0,
      routeId,
      status: idx % 3 === 0 ? 'BOARDED' : 'PENDING',
      scannedAt: idx % 3 === 0 ? '07:15 AM' : null,
      tripDate: '2026-08-12',
    });
  }

  for (let i = 0; i < allBookings.length; i += 500) {
    await prisma.booking.createMany({
      data: allBookings.slice(i, i + 500),
      skipDuplicates: true,
    });
    await prisma.passenger.createMany({
      data: allPassengers.slice(i, i + 500),
      skipDuplicates: true,
    });
  }

  console.log('=== NEON DB CLOUD SEED COMPLETE! ===');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
