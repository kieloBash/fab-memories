/*
  Warnings:

  - The values [CREDIT_CARD] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `confirmedAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedById` on the `Booking` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentId]` on the table `Installment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingId` to the `Installment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentType` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'INSTALLMENT');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('GCASH', 'MAYA', 'BANK_TRANSFER', 'CHEQUE', 'CASH');
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_confirmedById_fkey";

-- DropForeignKey
ALTER TABLE "Installment" DROP CONSTRAINT "Installment_paymentId_fkey";

-- DropIndex
DROP INDEX "Installment_paymentId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "confirmedAt",
DROP COLUMN "confirmedById",
ADD COLUMN     "depositVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "depositVerifiedById" TEXT;

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN     "bookingId" TEXT NOT NULL,
ALTER COLUMN "paymentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentType" "PaymentType" NOT NULL,
ADD COLUMN     "proofStoragePath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Installment_paymentId_key" ON "Installment"("paymentId");

-- CreateIndex
CREATE INDEX "Installment_bookingId_idx" ON "Installment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_paymentType_idx" ON "Payment"("paymentType");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_depositVerifiedById_fkey" FOREIGN KEY ("depositVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
