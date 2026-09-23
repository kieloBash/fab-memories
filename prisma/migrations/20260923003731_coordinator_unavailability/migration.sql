-- CreateTable
CREATE TABLE "CoordinatorUnavailability" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoordinatorUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoordinatorUnavailability_date_idx" ON "CoordinatorUnavailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorUnavailability_coordinatorId_date_key" ON "CoordinatorUnavailability"("coordinatorId", "date");

-- AddForeignKey
ALTER TABLE "CoordinatorUnavailability" ADD CONSTRAINT "CoordinatorUnavailability_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
