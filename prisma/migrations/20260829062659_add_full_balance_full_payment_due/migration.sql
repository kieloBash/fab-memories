-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'FULL_BALANCE';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "fullPaymentDueDate" TIMESTAMP(3);
