-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "requestKey" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_contractId_createdAt_id_idx" ON "Message"("contractId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_contractId_senderId_requestKey_key" ON "Message"("contractId", "senderId", "requestKey");

-- CreateIndex
CREATE INDEX "Notification_accountId_createdAt_id_idx" ON "Notification"("accountId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_accountId_eventKey_key" ON "Notification"("accountId", "eventKey");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
