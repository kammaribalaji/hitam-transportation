-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BusStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'SELECTED', 'RESERVED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PassengerStatus" AS ENUM ('BOARDED', 'PENDING', 'ABSENT');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'SIMULATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "year" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "assignedRouteId" TEXT NOT NULL DEFAULT 'R1',
    "transportFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "experience" TEXT NOT NULL DEFAULT '',
    "emergencyContact" TEXT NOT NULL DEFAULT '',
    "assignedBusNumber" TEXT NOT NULL DEFAULT '',
    "avatarInitial" TEXT NOT NULL DEFAULT 'U',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" UUID NOT NULL,
    "busNumber" TEXT NOT NULL,
    "busType" TEXT NOT NULL DEFAULT 'AC Seater',
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "driverId" TEXT NOT NULL DEFAULT '',
    "driverName" TEXT NOT NULL DEFAULT '',
    "routeId" TEXT NOT NULL DEFAULT '',
    "routeName" TEXT NOT NULL DEFAULT '',
    "status" "BusStatus" NOT NULL DEFAULT 'ACTIVE',
    "fuelLevel" INTEGER NOT NULL DEFAULT 75,
    "engineStatus" TEXT NOT NULL DEFAULT 'Good',
    "batteryHealth" TEXT NOT NULL DEFAULT 'Good',
    "tirePressure" TEXT NOT NULL DEFAULT 'Good',
    "odometer" INTEGER NOT NULL DEFAULT 45230,
    "lastService" TEXT NOT NULL DEFAULT '15 Jan 2026',
    "model" TEXT NOT NULL DEFAULT 'Ashok Leyland Viking',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "pickupPoint" TEXT NOT NULL,
    "reportingTime" TEXT NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 12000,
    "totalSeats" INTEGER NOT NULL DEFAULT 40,
    "bookedSeats" INTEGER NOT NULL DEFAULT 0,
    "stops" TEXT[],
    "startPoint" TEXT NOT NULL DEFAULT '',
    "endPoint" TEXT NOT NULL DEFAULT 'HITAM Campus',
    "distance" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" UUID NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "stopTime" TEXT NOT NULL DEFAULT '',
    "stopOrder" INTEGER NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeName" TEXT NOT NULL DEFAULT '',
    "driverRollNumber" TEXT NOT NULL DEFAULT '',
    "busNumber" TEXT NOT NULL DEFAULT '',
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "status" "TripStatus" NOT NULL DEFAULT 'UPCOMING',
    "date" TEXT NOT NULL DEFAULT '',
    "distance" TEXT NOT NULL DEFAULT '',
    "fuelUsed" TEXT NOT NULL DEFAULT '',
    "fuelCost" TEXT NOT NULL DEFAULT '',
    "avgMileage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentRollNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "year" TEXT NOT NULL DEFAULT '',
    "busNumber" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "pickupPoint" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "paymentDate" TEXT NOT NULL DEFAULT '',
    "validTill" TEXT NOT NULL DEFAULT '',
    "validityPeriod" TEXT NOT NULL DEFAULT '',
    "qrCodeData" TEXT NOT NULL,
    "bookingDate" TEXT NOT NULL DEFAULT '',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" UUID NOT NULL,
    "routeId" TEXT NOT NULL,
    "seatId" INTEGER NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "paymentId" TEXT NOT NULL,
    "studentRollNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "routeId" TEXT NOT NULL DEFAULT '',
    "bookingId" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'UPI',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "validTill" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusLocation" (
    "id" UUID NOT NULL,
    "driverRollNumber" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION,
    "source" "LocationSource" NOT NULL DEFAULT 'GPS',
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" UUID NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dept" TEXT NOT NULL DEFAULT '',
    "seatNo" INTEGER NOT NULL,
    "pickup" TEXT NOT NULL DEFAULT '',
    "feePaid" BOOLEAN NOT NULL DEFAULT true,
    "boarded" BOOLEAN NOT NULL DEFAULT false,
    "routeId" TEXT NOT NULL DEFAULT 'R1',
    "tripDate" TEXT NOT NULL DEFAULT '',
    "status" "PassengerStatus" NOT NULL DEFAULT 'PENDING',
    "scannedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT 'Just now',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL,
    "complaintId" TEXT NOT NULL,
    "studentRollNumber" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "date" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverContact" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueReport" (
    "id" UUID NOT NULL,
    "issueId" TEXT NOT NULL,
    "driverRollNumber" TEXT NOT NULL DEFAULT '',
    "issueType" TEXT NOT NULL DEFAULT '',
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" UUID NOT NULL,
    "collegeName" TEXT NOT NULL DEFAULT 'HITAM College',
    "transportIncharge" TEXT NOT NULL DEFAULT 'Transport Office',
    "email" TEXT NOT NULL DEFAULT 'transport@hitam.edu.in',
    "phone" TEXT NOT NULL DEFAULT '+91 40 1234 5678',
    "address" TEXT NOT NULL DEFAULT 'HITAM Campus, Hyderabad',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_rollNumber_key" ON "User"("rollNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_assignedRouteId_idx" ON "User"("assignedRouteId");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_busNumber_key" ON "Bus"("busNumber");

-- CreateIndex
CREATE INDEX "Bus_routeId_idx" ON "Bus"("routeId");

-- CreateIndex
CREATE INDEX "Bus_driverId_idx" ON "Bus"("driverId");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_stopOrder_key" ON "RouteStop"("routeId", "stopOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_tripId_key" ON "Trip"("tripId");

-- CreateIndex
CREATE INDEX "Trip_routeId_idx" ON "Trip"("routeId");

-- CreateIndex
CREATE INDEX "Trip_driverRollNumber_idx" ON "Trip"("driverRollNumber");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingId_key" ON "Booking"("bookingId");

-- CreateIndex
CREATE INDEX "Booking_studentRollNumber_idx" ON "Booking"("studentRollNumber");

-- CreateIndex
CREATE INDEX "Booking_routeId_idx" ON "Booking"("routeId");

-- CreateIndex
CREATE INDEX "Booking_seatNumber_idx" ON "Booking"("seatNumber");

-- CreateIndex
CREATE INDEX "Booking_bookingDate_idx" ON "Booking"("bookingDate");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_routeId_seatId_key" ON "Seat"("routeId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentId_key" ON "Payment"("paymentId");

-- CreateIndex
CREATE INDEX "Payment_studentRollNumber_idx" ON "Payment"("studentRollNumber");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusLocation_driverRollNumber_key" ON "BusLocation"("driverRollNumber");

-- CreateIndex
CREATE INDEX "BusLocation_routeId_idx" ON "BusLocation"("routeId");

-- CreateIndex
CREATE INDEX "BusLocation_busNumber_idx" ON "BusLocation"("busNumber");

-- CreateIndex
CREATE INDEX "BusLocation_lastPingAt_idx" ON "BusLocation"("lastPingAt");

-- CreateIndex
CREATE INDEX "Passenger_rollNumber_idx" ON "Passenger"("rollNumber");

-- CreateIndex
CREATE INDEX "Passenger_routeId_idx" ON "Passenger"("routeId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_targetRole_idx" ON "Notification"("targetRole");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintId_key" ON "Complaint"("complaintId");

-- CreateIndex
CREATE INDEX "Complaint_studentRollNumber_idx" ON "Complaint"("studentRollNumber");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IssueReport_issueId_key" ON "IssueReport"("issueId");

-- CreateIndex
CREATE INDEX "IssueReport_driverRollNumber_idx" ON "IssueReport"("driverRollNumber");

-- CreateIndex
CREATE INDEX "IssueReport_status_idx" ON "IssueReport"("status");

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
