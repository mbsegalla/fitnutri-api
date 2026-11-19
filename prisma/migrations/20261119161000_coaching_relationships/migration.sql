-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELED', 'ENDED');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('FREE', 'UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "requestKey" UUID NOT NULL,
    "modality" "Modality" NOT NULL,
    "terms" JSONB NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'REQUESTED',
    "payment" "PaymentState" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_professionalId_status_idx" ON "Contract"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_clientId_requestKey_key" ON "Contract"("clientId", "requestKey");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Contract_open_relationship" ON "Contract" ("clientId","professionalId","modality")
WHERE status IN ('REQUESTED','ACCEPTED');
