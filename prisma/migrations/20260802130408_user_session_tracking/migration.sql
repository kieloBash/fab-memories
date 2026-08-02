-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastSessionId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);
