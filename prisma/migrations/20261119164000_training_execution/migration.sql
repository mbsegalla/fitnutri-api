-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "day" CHAR(10) NOT NULL,
    "workoutIndex" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseExecution" (
    "sessionId" UUID NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL,
    "note" TEXT,

    CONSTRAINT "ExerciseExecution_pkey" PRIMARY KEY ("sessionId","exerciseIndex")
);

-- CreateTable
CREATE TABLE "SetExecution" (
    "sessionId" UUID NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "reps" INTEGER,
    "seconds" INTEGER,
    "loadKg" DOUBLE PRECISION,

    CONSTRAINT "SetExecution_pkey" PRIMARY KEY ("sessionId","exerciseIndex","setIndex")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_planId_day_workoutIndex_key" ON "WorkoutSession"("planId", "day", "workoutIndex");

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseExecution" ADD CONSTRAINT "ExerciseExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetExecution" ADD CONSTRAINT "SetExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
