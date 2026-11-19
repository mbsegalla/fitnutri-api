-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "format" "CareFormat" NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "initialSlotId" UUID NOT NULL,
    "requestKey" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_professionalId_startsAt_key" ON "AvailabilitySlot"("professionalId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_slotId_canceledAt_idx" ON "Appointment"("slotId", "canceledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_contractId_requestKey_key" ON "Appointment"("contractId", "requestKey");

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AvailabilitySlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Appointment_active_slot_key" ON "Appointment" ("slotId") WHERE "canceledAt" IS NULL;
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_valid_interval" CHECK ("endsAt" > "startsAt");
