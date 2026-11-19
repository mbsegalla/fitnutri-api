-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('NUTRITION', 'PERSONAL_TRAINING');

-- CreateEnum
CREATE TYPE "CareFormat" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "accountId" UUID NOT NULL,
    "draft" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "displayName" TEXT,
    "biography" TEXT,
    "photoUrl" TEXT,
    "specialties" TEXT[],
    "modalities" "Modality"[],
    "formats" "CareFormat"[],
    "city" TEXT,
    "state" TEXT,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modality" "Modality" NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "included" TEXT[],

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_slug_key" ON "ProfessionalProfile"("slug");

-- CreateIndex
CREATE INDEX "Offer_professionalId_idx" ON "Offer"("professionalId");

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("accountId") ON DELETE CASCADE ON UPDATE CASCADE;
