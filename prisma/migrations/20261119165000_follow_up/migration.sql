-- CreateTable
CREATE TABLE "CheckIn" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "weekStart" CHAR(10) NOT NULL,
    "adherence" INTEGER NOT NULL,
    "difficulty" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_contractId_weekStart_key" ON "CheckIn"("contractId", "weekStart");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
