/*
  Warnings:

  - Added the required column `clientPhone` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('FULL', 'INSTALLMENT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "clientPhone" TEXT NOT NULL,
ADD COLUMN     "depositAmount" DECIMAL(10,2),
ADD COLUMN     "depositDueDate" TIMESTAMP(3),
ADD COLUMN     "paymentPlan" "PaymentPlan",
ADD COLUMN     "staffNote" TEXT;
