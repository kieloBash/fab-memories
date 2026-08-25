/*
  Warnings:

  - You are about to drop the column `paymentId` on the `Installment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Installment" DROP CONSTRAINT "Installment_paymentId_fkey";

-- DropIndex
DROP INDEX "Installment_paymentId_key";

-- AlterTable
ALTER TABLE "Installment" DROP COLUMN "paymentId";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "installmentId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_installmentId_idx" ON "Payment"("installmentId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
