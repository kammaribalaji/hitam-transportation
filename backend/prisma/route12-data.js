// ============================================================================
// ROUTE 12 — SINGLE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
// This file is the ONLY place demo business data lives. The React frontend
// NEVER hardcodes this data — everything is served through the API
// (Express -> Prisma -> PostgreSQL). Run `npm run seed` to load it into the DB.
//
// Passenger records come from the supplied Route 12 student/transport sheet:
//   S.No | Date | Roll No | Name | Year | Boarding Point | Route No |
//   Amount | Paid | Balance | Seat No | Bus Pass Status
//
// Seat numbers are the ACTUAL seat numbers printed on the sheet (NOT a
// sequential 1..42 assignment). The sheet itself contains two quirks that are
// preserved exactly:
//   - seat 31 is assigned to TWO students (MUPPA RAHUL and JELLA PRAVEEN)
//   - VEMU ABHISHEK has seat "WAITLIST1" (stored as seat 0 internally, since
//     the schema uses integers; the WAITLIST1 label is kept in the QR data)
//
// Fee values are imported exactly (₹42,900 for every student except the STAFF
// record which is 0). Payment status is DERIVED at runtime from Amount/Paid:
//   balance = 0 -> PAID | paid > 0 -> PARTIALLY PAID | paid = 0 -> UNPAID
// All seeded users share the password: hitam123
// ============================================================================

export const ROUTE_12 = {
  id: '12',
  name: 'Route 12 - Sangareddy Old Bus Stand to HITAM College',
  destination: 'HITAM College',
  busNumber: 'TS 09 AB 1234',
  // HypeGPS physical tracker installed in the Route 12 bus (see GpsDevice table)
  gpsDeviceId: '1368',
  busType: 'AC Seater',
  capacity: 50,
  feeAmount: 42900,
  facultyIncharge: 'DEEPIKA',
  pickupPoint: 'Sangareddy Old Bus Stand',
  reportingTime: '06:40 AM',
  distance: '34.5 km',
  startPoint: 'Sangareddy Old Bus Stand',
  endPoint: 'HITAM College',
  driver: {
    rollNumber: 'DRV12345',
    name: 'RAJU',
    phone: '9490717770',
    email: 'raju@hitam.edu.in',
    licenseNo: 'TS2024001',
    experience: '6 Years',
    emergencyContact: '+91 90000 11111',
  },
  // 13 stops — exactly as supplied in the Route 12 sheet (times from the sheet,
  // coordinates from the route map data)
  stops: [
    { name: 'Sangareddy Old Bus Stand', latitude: 17.6269, longitude: 78.08607, stopTime: '06:40' },
    { name: 'Sangareddy New Bus Stand', latitude: 17.6152, longitude: 78.0825, stopTime: '06:50' },
    { name: 'Gokula Hospital', latitude: 17.6068, longitude: 78.0834, stopTime: '07:00' },
    { name: 'More Super Market', latitude: 17.605, longitude: 78.084, stopTime: '07:05' },
    { name: 'ITI', latitude: 17.6028, longitude: 78.0851, stopTime: '07:10' },
    { name: 'Star Hospital', latitude: 17.608, longitude: 78.0865, stopTime: '07:15' },
    { name: 'Collectorate', latitude: 17.624493, longitude: 78.08828, stopTime: '07:16' },
    { name: 'SBI Bank', latitude: 17.6165, longitude: 78.0835, stopTime: '07:18' },
    { name: 'Sangareddy X Road', latitude: 17.58787, longitude: 78.08391, stopTime: '07:20' },
    { name: 'Isnapur', latitude: 17.54653, longitude: 78.21308, stopTime: '07:40' },
    { name: 'Muthangi', latitude: 17.54096, longitude: 78.22715, stopTime: '07:45' },
    { name: 'Annaram', latitude: 17.63325, longitude: 78.37, stopTime: '08:20' },
    { name: 'HITAM College', latitude: 17.48543, longitude: 78.44862, stopTime: '08:45' },
  ],
};

// ----------------------------------------------------------------------------
// PASSENGERS — exactly as they appear in the supplied Route 12 sheet, in sheet
// order. `role` is 'STAFF' for the staff record, 'STUDENT' for students.
// A record is only imported when it has a Roll No + Name (seed skips rows
// missing them, so nothing fake is ever created).
// ----------------------------------------------------------------------------
export const PASSENGERS = [
  // S.No 1 — STAFF record (fee 0)
  { sNo: 1, date: '03/06/2026', rollNo: 'HTM923', name: 'PALLAVI S B', year: 'STAFF', boardingPoint: 'MUTHANGI', routeNo: '12', amount: 0, paid: 0, balance: 0, seatNo: 17, busPassStatus: 'PREPARED', role: 'STAFF' },
  { sNo: 2, date: '04/06/2026', rollNo: '25E51A0370', name: 'YARLAGADDA DESIVIRAPAN', year: '2nd Year', boardingPoint: 'SANGAREDDY', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 20, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 3, date: '05/06/2026', rollNo: '25E51A06A2', name: 'MANNE SRINIDHI', year: '2nd Year', boardingPoint: 'COLLECTRATE', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 23, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 4, date: '05/06/2026', rollNo: '25E51A06A3', name: 'MANNE SRINIDHI', year: '2nd Year', boardingPoint: 'COLLECTRATE', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 24, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 5, date: '08/06/2026', rollNo: '25E51A05G6', name: 'MUTHYALA HASASHRIKA', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 39, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 6, date: '12/06/2026', rollNo: '25E51A0127', name: 'MUPPA RAHUL', year: '2nd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 31, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 7, date: '13/06/2026', rollNo: '23E51A05B2', name: 'MALIPATIL SHRESHTA', year: '4th Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 44, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 8, date: '13/06/2026', rollNo: '25E51A0557', name: 'CHENNA RAKESH', year: '2nd Year', boardingPoint: 'SANGAREDDY OLD BUS STOP', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 25, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 9, date: '15/06/2026', rollNo: '25E51A0526', name: 'BANDANA SURYA NISKALA CHARANYA', year: '2nd Year', boardingPoint: 'MUTHANGI', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 22, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 10, date: '16/06/2026', rollNo: '25E51A052G', name: 'MUKTUL NANDHINI', year: '3rd Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 34, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 11, date: '17/06/2026', rollNo: '25E51A66D3', name: 'NIZAMPURAM VINAY', year: '2nd Year', boardingPoint: 'NEW BUS STAND', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 26, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 12, date: '18/06/2026', rollNo: '25E51A05B5', name: 'CHINNAPPARAM SANJANA REDDY', year: '2nd Year', boardingPoint: 'MUTHANGI', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 27, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 13, date: '19/06/2026', rollNo: '25E51A6797', name: 'KUSUMA AKSHAYA', year: '3rd Year', boardingPoint: 'MUTHANGI', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 37, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 14, date: '20/06/2026', rollNo: '24E51A05B1', name: 'VUPPALA ASHRITH', year: '3rd Year', boardingPoint: 'SANGAREDDY', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 35, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 15, date: '20/06/2026', rollNo: '25E51A05C8', name: 'KOULE SAI DEVHARSHHA GOUD', year: '3rd Year', boardingPoint: 'SANGAREDDY COLLECTRATE', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 30, busPassStatus: 'PREPARED', role: 'STUDENT' },
  // Seat 31 is duplicated on the sheet: MUPPA RAHUL (S.No 6) and JELLA PRAVEEN (S.No 16) both have seat 31
  { sNo: 16, date: '20/06/2026', rollNo: '25E51A05A3', name: 'JELLA PRAVEEN', year: '3rd Year', boardingPoint: 'MORE SUPER MARKET', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 31, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 17, date: '20/06/2026', rollNo: '25E51A05A2', name: 'KUMMERA ASHRITHA', year: '4th Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 43, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 18, date: '22/06/2026', rollNo: '25E51A0423', name: 'HEENA', year: '3rd Year', boardingPoint: 'SANGAREDDY', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 38, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 19, date: '22/06/2026', rollNo: '25E55A0521', name: 'PALLAVI KONDRA', year: '3rd Year', boardingPoint: 'SANGAREDDY NEW BUS STOP', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 42, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 20, date: '22/06/2026', rollNo: '25E51A0867', name: 'ESHKARI ANKIT KUMAR SINGH', year: '3rd Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 36, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 21, date: '22/06/2026', rollNo: '25E51A6755', name: 'GUDDOR SAI VARUN', year: '2nd Year', boardingPoint: 'SANGAREDDY NEW BUS STOP', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 16, busPassStatus: 'PREPARED', role: 'STUDENT' },
  // PARTIALLY PAID: paid 26900, balance 16000
  { sNo: 22, date: '22/06/2026', rollNo: '25E51A0445', name: 'PERURI VAISHNAVI', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 26900, balance: 16000, seatNo: 33, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 23, date: '22/06/2026', rollNo: '25E51A0424', name: 'GOPALPI SWETHA', year: '2nd Year', boardingPoint: 'ITI', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 29, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 24, date: '24/06/2026', rollNo: '25E51A0219', name: 'MARLA LIKHITHA', year: '3rd Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 49, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 25, date: '24/06/2026', rollNo: '25E51A0676', name: 'MARLA LALITHA', year: '4th Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 48, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 26, date: '27/06/2026', rollNo: '25E51A05M8', name: 'SURANI ISAQ', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 40, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 27, date: '27/06/2026', rollNo: '25E51A0509', name: 'AKKAMGARI GAYATHRI', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 32, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 28, date: '30/06/2026', rollNo: '25E51A0572', name: 'JAMAL SAITEJA', year: '4th Year', boardingPoint: 'SANGAREDDY NEW BUS STOP', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 45, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 29, date: '30/06/2026', rollNo: '25E51A0510', name: 'ALAMREDDY GARI SRI VYSHNAVI', year: '2nd Year', boardingPoint: 'RUDRARAM BUS STOP', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 28, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 30, date: '01/07/2026', rollNo: '25E51A0418', name: 'DURGAREDDY SAHITHI', year: '3rd Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 50, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 31, date: '01/07/2026', rollNo: '25E51A0660', name: 'GUDEPU SIDDARTHA', year: '3rd Year', boardingPoint: 'SANGAREDDY (STAR HOSPITAL)', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 41, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 32, date: '01/07/2026', rollNo: '25E51A06D1', name: 'NANAMKALA SAI SANKEERTH', year: '3rd Year', boardingPoint: 'SANGAREDDY (STAR HOSPITAL)', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 46, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 33, date: '03/07/2026', rollNo: '25E51A07E3', name: 'RACHA NEERAJ', year: '2nd Year', boardingPoint: 'COLLECTRATE', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 15, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 34, date: '03/07/2026', rollNo: '25E51A0554', name: 'DAPPURI ANJALI', year: '3rd Year', boardingPoint: 'ISNAPUR', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 19, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 35, date: '04/07/2026', rollNo: '25E51A053B', name: 'VISHKABANI HANNAH JEMIMA', year: '4th Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 18, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 36, date: '08/07/2026', rollNo: '25E51A67G3', name: 'SHARMA ROSHAN', year: '3rd Year', boardingPoint: 'SANGAREDDY - ITI', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 47, busPassStatus: 'PREPARED', role: 'STUDENT' },
  // UNPAID: paid 0, balance 42900
  { sNo: 37, date: '11/07/2026', rollNo: '25E51A0204', name: 'ALAWALA LAXMAN', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 0, balance: 42900, seatNo: 10, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 38, date: '15/07/2026', rollNo: '25E51A0570', name: 'E SAI SUMAN REDDY', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 11, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 39, date: '15/07/2026', rollNo: '25E51A05D0', name: 'DEEKSHITH JALIGI', year: '3rd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 1, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 40, date: '16/07/2026', rollNo: '10253', name: 'M KARTHIK SWAMY', year: '1st Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 8, busPassStatus: 'PREPARED', role: 'STUDENT' },
  { sNo: 41, date: '16/07/2026', rollNo: '10150', name: 'P RISHIDHAR REDDY', year: '2nd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 5, busPassStatus: 'PREPARED', role: 'STUDENT' },
  // WAITLIST: no physical seat on the sheet ("WAITLIST1")
  { sNo: 42, date: '18/07/2026', rollNo: '24E51A0505', name: 'VEMU ABHISHEK', year: '2nd Year', boardingPoint: 'SANGAREDDY X ROAD', routeNo: '12', amount: 42900, paid: 42900, balance: 0, seatNo: 'WAITLIST1', busPassStatus: 'PREPARED', role: 'STUDENT' },
];
