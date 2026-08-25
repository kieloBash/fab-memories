-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLATION_REQUESTED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationRequestReason" TEXT,
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "packageCustomizations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "venueFormattedAddress" TEXT,
ADD COLUMN     "venueLatitude" DOUBLE PRECISION,
ADD COLUMN     "venueLongitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "priceProvincial" DECIMAL(10,2);
