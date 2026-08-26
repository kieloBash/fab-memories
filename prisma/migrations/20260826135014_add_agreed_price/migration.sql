/*
  Warnings:

  - Added the required column `agreedPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agreedPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "isProvincial" BOOLEAN NOT NULL DEFAULT false;
