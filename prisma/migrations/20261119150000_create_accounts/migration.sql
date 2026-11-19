CREATE TABLE "Account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_email_normalized" CHECK ("email" = lower(btrim("email") COLLATE "C"))
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
