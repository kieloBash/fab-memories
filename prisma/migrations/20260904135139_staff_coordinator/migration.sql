-- CreateEnum
CREATE TYPE "StaffTaskRole" AS ENUM ('LEAD_COORDINATOR', 'GUEST_REGISTRATION', 'VENDOR_LIAISON', 'LOGISTICS', 'PROGRAM_FLOW', 'OTHER');

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "taskRole" "StaffTaskRole" NOT NULL,
    "taskNote" TEXT,
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffAssignment_bookingId_idx" ON "StaffAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "StaffAssignment_coordinatorId_idx" ON "StaffAssignment"("coordinatorId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_bookingId_coordinatorId_key" ON "StaffAssignment"("bookingId", "coordinatorId");

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
