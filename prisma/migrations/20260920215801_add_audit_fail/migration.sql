-- CreateTable
CREATE TABLE "AuditWriteFailure" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "module" "AuditModule" NOT NULL,
    "description" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AuditWriteFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditWriteFailure_createdAt_idx" ON "AuditWriteFailure"("createdAt");
