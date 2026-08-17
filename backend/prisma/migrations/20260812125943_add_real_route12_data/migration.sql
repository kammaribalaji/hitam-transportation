-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "tripId" TEXT NOT NULL DEFAULT 'TRIP-001',
ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "boardingPoint" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "feeBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "feePaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "assignedRouteId" SET DEFAULT '12';

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- DB-level guarantee: a seat can be occupied by only one active booking per trip
CREATE UNIQUE INDEX "Booking_tripId_seatNumber_active_key" ON "Booking"("tripId", "seatNumber") WHERE "isActive" = true AND "status" <> 'CANCELLED';
