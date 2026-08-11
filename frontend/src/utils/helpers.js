export const ROUTES_DATA = [
  { id: 'R1', name: 'Route R1 - LB Nagar to HITAM Campus', busNumber: 'TS 09 AB 1234', pickupPoint: 'LB Nagar Metro Gate 2', reportingTime: '07:15 AM', feeAmount: 12000, totalSeats: 40, bookedSeats: 28, stops: ['LB Nagar Metro', 'Dilsukhnagar', 'Malakpet', 'Bowenpally', 'Medchal', 'HITAM Campus'] },
  { id: 'R2', name: 'Route R2 - Kukatpally to HITAM Campus', busNumber: 'TS 09 AB 5678', pickupPoint: 'Kukatpally Housing Board', reportingTime: '07:30 AM', feeAmount: 11500, totalSeats: 40, bookedSeats: 31, stops: ['Kukatpally KPHB', 'Miyapur X Road', 'Nizampet X Road', 'Bachupally', 'Gandimaisamma', 'HITAM Campus'] },
  { id: 'R3', name: 'Route R3 - Uppal to HITAM Campus', busNumber: 'TS 09 AB 9012', pickupPoint: 'Uppal Ring Road', reportingTime: '07:10 AM', feeAmount: 12500, totalSeats: 40, bookedSeats: 22, stops: ['Uppal Ring Road', 'Tarnaka Metro', 'Secunderabad Station', 'Suchitra Circle', 'HITAM Campus'] },
  { id: 'R4', name: 'Route R4 - Mehdipatnam to HITAM Campus', busNumber: 'TS 09 AB 3456', pickupPoint: 'Mehdipatnam Pillar 45', reportingTime: '07:05 AM', feeAmount: 13000, totalSeats: 40, bookedSeats: 35, stops: ['Mehdipatnam Bus Stop', 'Panjagutta Circle', 'Begumpet Airport', 'Balanagar', 'Jeedimetla', 'HITAM Campus'] },
  { id: 'R5', name: 'Route R5 - ECIL to HITAM Campus', busNumber: 'TS 09 AB 7890', pickupPoint: 'ECIL Bus Depot', reportingTime: '07:20 AM', feeAmount: 11000, totalSeats: 40, bookedSeats: 25, stops: ['ECIL X Road', 'AS Rao Nagar', 'Sainikpuri', 'Alwal', 'Suchitra Junction', 'HITAM Campus'] },
  { id: 'R6', name: 'Route R6 - Gachibowli to HITAM Campus', busNumber: 'TS 09 AB 4321', pickupPoint: 'Gachibowli Flyover', reportingTime: '07:00 AM', feeAmount: 13500, totalSeats: 40, bookedSeats: 18, stops: ['Gachibowli ORR', 'Hitech City Metro', 'Madhapur Police Station', 'Kondapur', 'HITAM Campus'] },
]

export const MOCK_CONTACTS = [
  { _id: '1', name: 'Suresh Kumar', role: 'Bus Driver', phone: '+91 98765 43210', busNumber: 'TS 09 AB 1234', subtitle: 'Route R1 Lead Driver' },
  { _id: '2', name: 'Anil Verma', role: 'Bus In-charge', phone: '+91 91234 56789', busNumber: 'TS 09 AB 1234', subtitle: 'Faculty Transport Coordinator' },
  { _id: '3', name: 'Office Helpline', role: 'Transport Office', phone: '+91 40 1234 5678', busNumber: 'HITAM Campus', subtitle: 'Available 6:00 AM - 10:00 PM' },
  { _id: '4', name: '24x7 Emergency Support', role: 'HITAM Security', phone: '+91 90000 11222', busNumber: 'All Routes', subtitle: 'Emergency Hotline' },
]

export const MOCK_NOTIFICATIONS = [
  { _id: '0', title: '📢 Campus Transport Notice', message: 'All evening return buses will leave campus at 04:45 PM starting next week.', time: 'Just now', isRead: false, type: 'ANNOUNCEMENT' },
  { _id: '1', title: 'Seat Confirmed', message: 'Your seat #11 for Route R1 is confirmed for today\'s trip.', time: '09:00 AM', isRead: false, type: 'SEAT' },
  { _id: '2', title: 'Transport Fee Receipt', message: 'Payment of ₹12,000 received successfully.', time: 'Yesterday', isRead: false, type: 'PAYMENT' },
  { _id: '3', title: 'Bus Arrived at Main Gate', message: 'Bus TS 09 AB 1234 is now waiting at Main Gate.', time: '07:25 AM', isRead: true, type: 'DELAY' },
  { _id: '4', title: 'Route R1 Maintenance Complete', message: 'Bus TS 09 AB 1234 serviced & fully operational.', time: '2 days ago', isRead: true, type: 'SYSTEM' },
]

export const MOCK_PASSENGERS = [
  { rollNumber: '21CS1001', name: 'Rahul Sharma', dept: 'CSE', seatNo: 11, pickup: 'Main Gate', feePaid: true, boarded: true, status: 'BOARDED' },
  { rollNumber: '21ECE045', name: 'Priya Verma', dept: 'ECE', seatNo: 5, pickup: 'City Center', feePaid: true, boarded: false, status: 'PENDING' },
  { rollNumber: '21ME012', name: 'Amit Patel', dept: 'MECH', seatNo: 8, pickup: 'Kukatpally', feePaid: true, boarded: true, status: 'BOARDED' },
  { rollNumber: '21EEE088', name: 'Sneha Kumar', dept: 'EEE', seatNo: 10, pickup: 'Miyapur', feePaid: true, boarded: false, status: 'ABSENT' },
  { rollNumber: '21CS1089', name: 'Deepika Roy', dept: 'CSE', seatNo: 15, pickup: 'Main Gate', feePaid: true, boarded: true, status: 'BOARDED' },
  { rollNumber: '21IT023', name: 'Venkatesh K', dept: 'IT', seatNo: 23, pickup: 'JNTU', feePaid: true, boarded: true, status: 'BOARDED' },
  { rollNumber: '21CS2010', name: 'Arjun Reddy', dept: 'CSE', seatNo: 18, pickup: 'LB Nagar', feePaid: true, boarded: false, status: 'PENDING' },
  { rollNumber: '21ECE020', name: 'Kavya Sharma', dept: 'ECE', seatNo: 22, pickup: 'Dilsukhnagar', feePaid: true, boarded: true, status: 'BOARDED' },
]

export const MOCK_TRIPS = [
  { tripId: 'T001', routeId: 'R1', routeName: 'R1 - Main Campus to City Center', busNumber: 'TS 09 AB 1234', startTime: '07:00 AM', endTime: '08:30 AM', studentCount: 36, status: 'IN_PROGRESS', date: '07 Aug 2026', distance: '54.3 km', fuelUsed: '8L', fuelCost: '₹740', avgMileage: '4.2 km/L' },
  { tripId: 'T002', routeId: 'R2', routeName: 'R2 - City Center to Main Campus', busNumber: 'TS 09 AB 1234', startTime: '04:30 PM', endTime: '06:00 PM', studentCount: 34, status: 'UPCOMING', date: '07 Aug 2026', distance: '', fuelUsed: '', fuelCost: '', avgMileage: '' },
  { tripId: 'T003', routeId: 'R1', routeName: 'R1 - Main Campus to City Center', busNumber: 'TS 09 AB 1234', startTime: '07:00 AM', endTime: '08:25 AM', studentCount: 38, status: 'COMPLETED', date: '06 Aug 2026', distance: '54.3 km', fuelUsed: '7.8L', fuelCost: '₹720', avgMileage: '4.4 km/L' },
  { tripId: 'T004', routeId: 'R3', routeName: 'R3 - Main Campus to Railway Station', busNumber: 'TS 09 AB 9012', startTime: '06:00 PM', endTime: '08:00 PM', studentCount: 30, status: 'UPCOMING', date: '07 Aug 2026', distance: '', fuelUsed: '', fuelCost: '', avgMileage: '' },
]

export const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`

export const getStatusColor = (status) => {
  const map = {
    CONFIRMED: 'bg-green-100 text-green-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-green-100 text-green-700',
    BOARDED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    UPCOMING: 'bg-blue-100 text-blue-700',
    OPEN: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    COMPLETED: 'bg-gray-100 text-gray-600',
    RESOLVED: 'bg-green-100 text-green-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    ABSENT: 'bg-red-100 text-red-700',
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}
