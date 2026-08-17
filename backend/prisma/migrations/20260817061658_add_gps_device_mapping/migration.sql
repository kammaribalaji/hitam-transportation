-- CreateTable
CREATE TABLE "GpsDevice" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GpsDevice_deviceId_key" ON "GpsDevice"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "GpsDevice_busNumber_key" ON "GpsDevice"("busNumber");

-- CreateIndex
CREATE INDEX "GpsDevice_routeId_idx" ON "GpsDevice"("routeId");
