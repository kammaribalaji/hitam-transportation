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
  console.log('=== SEEDING HITAM TRANSPORT PRODUCTION DATABASE ===');

  const masterDbPath = path.resolve(__dirname, '../src/data/master_transport_database.json');
  if (!fs.existsSync(masterDbPath)) {
    throw new Error(`Master database file not found at ${masterDbPath}`);
  }

  const masterDb = JSON.parse(fs.readFileSync(masterDbPath, 'utf8'));
  const defaultPasswordHash = await bcrypt.hash('hitam123', 10);

  // 1. Clean old records
  await prisma.passenger.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.gpsDevice.deleteMany({});
  await prisma.driverContact.deleteMany({});

  // 2. Seed Admin
  await prisma.user.upsert({
    where: { rollNumber: 'ADMIN001' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      rollNumber: 'ADMIN001',
      name: 'Transport Administrator',
      email: 'admin@hitam.edu.in',
      phone: '+91 9490717770',
      role: 'ADMIN',
      department: 'TRANSPORT',
      year: 'N/A',
      passwordHash: defaultPasswordHash,
    },
  });

  // 3. Seed All 23 Routes & Stops
  console.log(`Seeding ${masterDb.routes.length} Routes...`);
  for (const r of masterDb.routes) {
    const routeId = String(r.id);
    const busNumber = r.busNumber || `TS 09 UB ${1200 + parseInt(routeId)}`;

    await prisma.route.upsert({
      where: { id: routeId },
      update: {
        name: r.name,
        busNumber,
        pickupPoint: r.startPoint,
        reportingTime: r.reportingTime || '07:00 AM',
        startPoint: r.startPoint,
        endPoint: 'HITAM College',
        totalSeats: 50,
        feeAmount: 42900,
        stops: r.stops.map((s) => s.name),
        isActive: true,
      },
      create: {
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
      await prisma.routeStop.create({
        data: {
          routeId,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          stopTime: s.stopTime || '',
          stopOrder: idx + 1,
        },
      });
    }

    const driverRoll = `DRV${routeId.padStart(3, '0')}`;
    await prisma.user.upsert({
      where: { rollNumber: driverRoll },
      update: {
        name: r.driverName || `Driver Route ${routeId}`,
        phone: r.driverPhone || '',
        assignedRouteId: routeId,
        assignedBusNumber: busNumber,
        passwordHash: defaultPasswordHash,
      },
      create: {
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
      },
    });

    await prisma.driverContact.create({
      data: {
        name: r.driverName,
        role: 'Driver',
        phone: r.driverPhone || '9490717770',
        busNumber,
        subtitle: `Route ${routeId} Driver • ${r.startPoint}`,
      },
    });

    const deviceId = String(1356 + parseInt(routeId));
    await prisma.gpsDevice.create({
      data: { routeId, deviceId, busNumber },
    });
  }

  // 4. Seed Master Students
  console.log(`Seeding ${masterDb.master_students.length} Master Students...`);
  for (const s of masterDb.master_students) {
    const roll = s.rollNumber.trim().toUpperCase();
    if (!roll) continue;
    await prisma.user.upsert({
      where: { rollNumber: roll },
      update: { name: s.name, year: s.year || '2nd Year' },
      create: {
        rollNumber: roll,
        name: s.name,
        email: `${roll.toLowerCase()}@hitam.edu.in`,
        phone: '',
        role: 'STUDENT',
        department: 'CSE',
        year: s.year || '2nd Year',
        passwordHash: defaultPasswordHash,
      },
    });
  }

  // 5. Seed 1,100 Passengers & Bookings
  console.log(`Seeding ${masterDb.passengers.length} Passengers & Bookings...`);
  for (const p of masterDb.passengers) {
    const cleanName = p.name.replace(/\s+/g, ' ').trim().toUpperCase();
    const roll = p.rollNumber.trim().toUpperCase();
    const routeId = String(p.routeId);
    const isStaff = p.isStaff || roll.startsWith('HTM');
    const isPaid = p.feeBalance <= 0 && p.feePaidAmount > 0;
    const isPartial = p.feeBalance > 0 && p.feePaidAmount > 0;
    const busNumber = `TS 09 UB ${1200 + parseInt(routeId)}`;

    await prisma.user.upsert({
      where: { rollNumber: roll },
      update: {
        name: cleanName,
        role: isStaff ? 'STAFF' : 'STUDENT',
        assignedRouteId: routeId,
        boardingPoint: p.boardingPoint,
        feeAmount: p.feeAmount,
        feePaidAmount: p.feePaidAmount,
        feeBalance: p.feeBalance,
        transportFeePaid: p.feePaidAmount > 0,
        year: p.year,
        assignedBusNumber: busNumber,
      },
      create: {
        rollNumber: roll,
        name: cleanName,
        email: `${roll.toLowerCase()}@hitam.edu.in`,
        phone: '',
        role: isStaff ? 'STAFF' : 'STUDENT',
        assignedRouteId: routeId,
        boardingPoint: p.boardingPoint,
        feeAmount: p.feeAmount,
        feePaidAmount: p.feePaidAmount,
        feeBalance: p.feeBalance,
        transportFeePaid: p.feePaidAmount > 0,
        department: isStaff ? 'FACULTY' : 'B.Tech',
        year: p.year,
        assignedBusNumber: busNumber,
        passwordHash: defaultPasswordHash,
      },
    });

    await prisma.passenger.create({
      data: {
        rollNumber: roll,
        name: cleanName,
        dept: isStaff ? 'STAFF' : 'B.Tech',
        seatNo: p.seatNumber || 0,
        pickup: p.boardingPoint,
        feePaid: p.feePaidAmount > 0,
        boarded: false,
        routeId,
        status: 'PENDING',
      },
    });

    const bookingId = `BK-${routeId}-${roll}`;
    await prisma.booking.create({
      data: {
        bookingId,
        studentRollNumber: roll,
        studentName: cleanName,
        department: isStaff ? 'STAFF' : 'B.Tech',
        year: p.year,
        busNumber,
        routeId,
        routeName: `Route ${routeId}`,
        seatNumber: p.seatNumber || 0,
        pickupPoint: p.boardingPoint,
        paymentStatus: isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'PENDING',
        amountPaid: p.feePaidAmount,
        qrCodeData: JSON.stringify({ roll, routeId, seat: p.seatNumber, name: cleanName }),
        status: p.seatNumber > 0 ? 'CONFIRMED' : 'PENDING',
      },
    });
  }

  console.log('=== MASTER PRODUCTION SEED COMPLETE! ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
