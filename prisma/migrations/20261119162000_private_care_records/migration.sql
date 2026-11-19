-- CreateTable
CREATE TABLE "Intake" (
    "contractId" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intake_pkey" PRIMARY KEY ("contractId")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "measures" JSONB NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareDocument" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisDraft" TEXT,
    "publishedAnalysis" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "CareDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_contractId_assessedAt_idx" ON "Assessment"("contractId", "assessedAt");

-- CreateIndex
CREATE INDEX "CareDocument_contractId_createdAt_idx" ON "CareDocument"("contractId", "createdAt");

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareDocument" ADD CONSTRAINT "CareDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
