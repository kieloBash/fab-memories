/*
  Warnings:

  - The values [LOGIN_FAILED,FLAG,CANCEL,ASSIGN,GENERATE,ROLE_CHANGE] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - The values [USER,PACKAGE,STAFF,AUDIT] on the enum `AuditModule` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `entityId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userRole` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastSessionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ClientProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoordinatorProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'CONFIRM', 'DECLINE', 'EXPORT', 'VIEW');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AuditModule_new" AS ENUM ('AUTH', 'USER_MANAGEMENT', 'BOOKING', 'PAYMENT', 'VENDOR', 'STAFF_SCHEDULE', 'DOCUMENT', 'REPORT');
ALTER TABLE "AuditLog" ALTER COLUMN "module" TYPE "AuditModule_new" USING ("module"::text::"AuditModule_new");
ALTER TYPE "AuditModule" RENAME TO "AuditModule_old";
ALTER TYPE "AuditModule_new" RENAME TO "AuditModule";
DROP TYPE "public"."AuditModule_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ClientProfile" DROP CONSTRAINT "ClientProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "CoordinatorProfile" DROP CONSTRAINT "CoordinatorProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_action_idx";

-- DropIndex
DROP INDEX "AuditLog_entityType_entityId_idx";

-- DropIndex
DROP INDEX "User_isActive_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "ipAddress",
DROP COLUMN "userAgent",
DROP COLUMN "userEmail",
DROP COLUMN "userRole";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "imageUrl",
DROP COLUMN "lastLoginAt",
DROP COLUMN "lastName",
DROP COLUMN "lastSessionId",
DROP COLUMN "lastSyncedAt",
DROP COLUMN "phone",
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- DropTable
DROP TABLE "ClientProfile";

-- DropTable
DROP TABLE "CoordinatorProfile";

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "LocationZone";

-- DropEnum
DROP TYPE "NotificationType";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
