-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "day" CHAR(10) NOT NULL,
    "mealIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanVersion_contractId_publishedAt_idx" ON "PlanVersion"("contractId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_contractId_version_key" ON "PlanVersion"("contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MealLog_planId_day_mealIndex_key" ON "MealLog"("planId", "day", "mealIndex");

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
