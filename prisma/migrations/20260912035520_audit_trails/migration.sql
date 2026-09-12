/*
  Warnings:

  - A unique constraint covering the columns `[sequence]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hash` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "hash" TEXT NOT NULL,
ADD COLUMN     "previousHash" TEXT,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ALTER COLUMN "metadata" SET DATA TYPE JSON;

-- CreateTable
CREATE TABLE "AuditChainState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastHash" TEXT,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChainState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_sequence_key" ON "AuditLog"("sequence");

-- CreateIndex
CREATE INDEX "AuditLog_sequence_idx" ON "AuditLog"("sequence");
