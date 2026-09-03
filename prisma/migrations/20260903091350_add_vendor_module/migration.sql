-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'FLORALS', 'DECORATION', 'SOUNDS_LIGHTING', 'VENUE', 'HAIR_MAKEUP', 'ENTERTAINMENT', 'TRANSPORTATION', 'OTHER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "vendorCategories" "VendorCategory"[] DEFAULT ARRAY[]::"VendorCategory"[];

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactChannel" TEXT,
    "coverageAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingVendor" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingVendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_category_idx" ON "Vendor"("category");

-- CreateIndex
CREATE INDEX "Vendor_isActive_idx" ON "Vendor"("isActive");

-- CreateIndex
CREATE INDEX "BookingVendor_bookingId_idx" ON "BookingVendor"("bookingId");

-- CreateIndex
CREATE INDEX "BookingVendor_vendorId_idx" ON "BookingVendor"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVendor_bookingId_vendorId_key" ON "BookingVendor"("bookingId", "vendorId");

-- AddForeignKey
ALTER TABLE "BookingVendor" ADD CONSTRAINT "BookingVendor_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingVendor" ADD CONSTRAINT "BookingVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
