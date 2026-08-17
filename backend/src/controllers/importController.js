import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const cleanNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Payment status derived from the sheet's Amount / Paid / Balance.
const derive = (amount, paid) => {
  const amt = Number(amount) || 0;
  const pd = Number(paid) || 0;
  if (amt - pd <= 0) return 'PAID';
  if (pd > 0) return 'PARTIALLY PAID';
  return 'UNPAID';
};
const display = (s) => (s === 'PAID' ? 'Paid (Annual Pass)' : s === 'PARTIALLY PAID' ? 'Partially Paid' : 'Pending');

// Quote-aware row splitter: keeps "12,000" and "Smith, John" as single cells.
const splitRow = (line, sep) => {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let k = 0; k < line.length; k += 1) {
    const ch = line[k];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
};

// Minimal CSV parser — supports comma / tab / pipe separators and quoted cells.
const parseCsv = (text) => {
  const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  const first = lines[0] || '';
  const counts = {
    ',': (first.match(/,/g) || []).length,
    '\t': (first.match(/\t/g) || []).length,
    '|': (first.match(/\|/g) || []).length,
  };
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';
  return lines.map((l) => splitRow(l, sep).map((c) => c.trim()));
};

/**
 * POST /api/import/route12  (ADMIN)
 * Body: { csv } — rows from the Route 12 sheet:
 *   S.No | Date | Roll No | Name | Year | Boarding Point | Route No | Amount | Paid | Balance | Seat No (optional)
 * When a Seat No column is present its values are used exactly as printed on
 * the sheet ("WAITLIST1" -> stored as seat 0); otherwise seats are assigned in
 * sheet order (row 1 -> seat 1 ...).
 * Each row is written atomically; a failing row rolls back fully and is reported
 * in `errors` without aborting the rest of the import. Re-importing the same
 * sheet refreshes records (repeatable).
 */
export const importRoute12 = async (req, res, next) => {
  try {
    const csv = String(req.body.csv || '').trim();
    if (!csv) throw new AppError('Paste the CSV data first', 400);

    const rows = parseCsv(csv);
    let start = 0;
    if (/roll/i.test(rows[0]?.[2] || '') && /name/i.test(rows[0]?.[3] || '')) start = 1;
    if (rows.length - start === 0) throw new AppError('No data rows found', 400);

    const passwordHash = await bcrypt.hash('hitam123', 10);
    const now = new Date();
    const todayStr = fmt(now);
    const validTill = fmt(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));

    const errors = [];
    const seenRolls = new Set();
    let imported = 0;
    let updated = 0;
    let seatIndex = 0;
    let rowNo = 0;
    const affectedRoutes = new Set();

    for (let i = start; i < rows.length; i += 1) {
      const c = rows[i];
      const roll = String(c[2] || '').trim();
      const name = String(c[3] || '').trim();

      if (!roll) { errors.push(`Row ${i + 1}: missing Roll No — skipped`); continue; }
      if (!name) { errors.push(`Row ${i + 1} (${roll}): missing Name — skipped`); continue; }
      if (seenRolls.has(roll)) {
        errors.push(`Row ${i + 1} (${roll}): duplicate Roll No in the sheet — skipped (first occurrence kept)`);
        continue;
      }
      seenRolls.add(roll);

      const year = String(c[4] || '').trim();
      const boarding = String(c[5] || '').trim();
      const routeId = String(c[6] || '').trim() || '12';
      const amount = cleanNum(c[7]);
      const paid = cleanNum(c[8]);
      const balance = c[9] !== undefined && String(c[9]).trim() !== '' ? cleanNum(c[9]) : Math.max(0, amount - paid);
      const role = /staff/i.test(year) ? 'STAFF' : 'STUDENT';
      const st = derive(amount, paid);
      const paidBool = st === 'PAID';

      // Seat No column (c[10]) is optional: use it when present, otherwise fall
      // back to assigning seats in sheet order. "WAITLIST1" -> seat 0.
      const seatRaw = String(c[10] || '').trim();
      let seatNumber;
      if (seatRaw !== '') {
        seatNumber = /waitlist/i.test(seatRaw) ? 0 : Math.max(0, Math.floor(cleanNum(seatRaw)));
      } else {
        seatNumber = seatIndex + 1;
        seatIndex += 1;
      }
      if (seatNumber > 50) {
        errors.push(`Row ${i + 1} (${roll}): seat ${seatNumber} exceeds bus capacity 50 — skipped`);
        continue;
      }
      const seatLabel = seatNumber >= 1 ? seatNumber : 'WAITLIST1';
      rowNo += 1; // contiguous IDs even if a row later rolls back

      try {
        // Each row is atomic: any failure rolls back ALL of this row's writes.
        const wasNew = await prisma.$transaction(async (tx) => {
          const route = await tx.route.findUnique({ where: { id: routeId } });
          const routeName = route?.name || `Route ${routeId} - to HITAM College`;

          const existing = await tx.user.findUnique({ where: { rollNumber: roll } });
          await tx.user.upsert({
            where: { rollNumber: roll },
            create: {
              rollNumber: roll, name, department: year, year, role, assignedRouteId: routeId,
              boardingPoint: boarding, feeAmount: amount, feePaidAmount: paid, feeBalance: balance,
              transportFeePaid: paidBool, avatarInitial: name[0] || 'S', passwordHash,
            },
            update: {
              name, department: year, year, role, assignedRouteId: routeId,
              boardingPoint: boarding, feeAmount: amount, feePaidAmount: paid, feeBalance: balance,
              transportFeePaid: paidBool,
            },
          });

          // Recreate this student's occupancy records (repeatable import)
          await tx.booking.deleteMany({ where: { studentRollNumber: roll } });
          await tx.payment.deleteMany({ where: { studentRollNumber: roll } });
          await tx.passenger.deleteMany({ where: { rollNumber: roll } });
          await tx.notification.deleteMany({ where: { userId: roll, type: 'SEAT' } });

          const bookingId = `HITAM-PASS-2026-${String(1001 + rowNo)}`;
          const busNo = 'TS 09 AB 1234';

          await tx.booking.create({
            data: {
              bookingId, tripId: 'TRIP-001', studentRollNumber: roll, studentName: name,
              department: year, year, busNumber: busNo, routeId, routeName,
              seatNumber, pickupPoint: boarding, paymentStatus: display(st),
              paymentMethod: paidBool ? 'UPI' : '', paymentDate: paidBool ? todayStr : '',
              validTill: paidBool ? validTill : '',
              validityPeriod: paidBool ? `Valid for 1 Year (${todayStr} - ${validTill})` : '',
              qrCodeData: `HITAM|${roll}|${busNo}|SEAT${seatLabel}|${st}`,
              bookingDate: todayStr, amountPaid: paid, isActive: true, status: 'CONFIRMED',
            },
          });

          await tx.payment.create({
            data: {
              paymentId: `PAY-2026-${String(5001 + rowNo)}`, studentRollNumber: roll,
              studentName: name, routeId, bookingId, amount: paid, method: 'UPI',
              status: paidBool ? 'PAID' : 'PENDING',
              transactionRef: paidBool ? `TXN-IMPORT-${rowNo}` : '',
              date: paidBool ? todayStr : '', validTill: paidBool ? validTill : '',
            },
          });

          await tx.passenger.create({
            data: {
              rollNumber: roll, name, dept: year, seatNo: seatNumber, pickup: boarding,
              feePaid: paidBool, boarded: false, routeId, tripDate: todayStr, status: 'PENDING',
            },
          });

          await tx.notification.create({
            data: {
              title: seatNumber >= 1 ? (paidBool ? 'Seat Confirmed' : 'Seat Reserved') : 'Waitlisted',
              message: seatNumber >= 1
                ? paidBool
                  ? `Your seat #${seatLabel} on Route ${routeId} is confirmed.`
                  : `Your seat #${seatLabel} on Route ${routeId} is reserved. Complete your transport fee payment.`
                : 'You are on the Route 12 waitlist. A seat will be assigned when one becomes available.',
              type: 'SEAT', targetRole: 'STUDENT', userId: roll,
            },
          });

          // Mark the physical seat occupied (row created if missing); waitlisted
          // passengers (seat 0) have no physical seat.
          if (seatNumber >= 1) {
            await tx.seat.upsert({
              where: { routeId_seatId: { routeId, seatId: seatNumber } },
              create: { routeId, seatId: seatNumber, status: 'BOOKED' },
              update: { status: 'BOOKED' },
            });
          }

          affectedRoutes.add(routeId);
          return !existing; // true when this was a brand-new student
        });

        if (wasNew) imported += 1; else updated += 1;
      } catch (rowErr) {
        // A single conflicting/broken row must not abort the whole import.
        if (rowErr?.code === 'P2002') {
          errors.push(`Row ${i + 1} (${roll}): conflicting record — import the full sheet in one go`);
        } else {
          errors.push(`Row ${i + 1} (${roll}): ${rowErr?.message || 'unexpected error'}`);
        }
      }
    }

    // Recompute occupancy from the database so existing/manual bookings are
    // never lost from the count by an overwrite.
    for (const routeId of affectedRoutes) {
      const count = await prisma.booking.count({
        where: { routeId, isActive: true, status: { not: 'CANCELLED' } },
      });
      await prisma.route.update({ where: { id: routeId }, data: { bookedSeats: count } });
    }

    res.json({
      imported, updated, skipped: errors.length, errors, total: imported + updated,
    });
  } catch (err) {
    next(err);
  }
};
