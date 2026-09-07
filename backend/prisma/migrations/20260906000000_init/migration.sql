CREATE SCHEMA IF NOT EXISTS "public";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'SITE_ADMIN', 'RECEPTIONIST');
CREATE TYPE "ResourceType" AS ENUM ('HOT_DESK', 'DEDICATED_DESK', 'MEETING_ROOM');
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "TransactionType" AS ENUM ('GRANT', 'CONSUME', 'REFUND', 'EXPIRE');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_attempts" (
  "normalizedEmail" TEXT NOT NULL,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("normalizedEmail")
);

CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sites" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "openingTime" TEXT NOT NULL DEFAULT '08:00',
  "closingTime" TEXT NOT NULL DEFAULT '22:00',
  "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
  "utcOffsetMinutes" INTEGER NOT NULL DEFAULT -300,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operating_hours" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "opensAt" TEXT NOT NULL,
  "closesAt" TEXT NOT NULL,
  CONSTRAINT "operating_hours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_staff" (
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "site_staff_pkey" PRIMARY KEY ("siteId", "userId")
);

CREATE TABLE "resources" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ResourceType" NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "creditCostAmount" INTEGER NOT NULL DEFAULT 1,
  "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_blocks" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "cancelledReservationsCount" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_blocks_valid_range" CHECK ("startsAt" < "endsAt")
);

CREATE TABLE "holds" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "creditsRequired" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "holds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "holds_valid_range" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "holds_positive_credits" CHECK ("creditsRequired" > 0)
);

CREATE TABLE "reservations" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "creditsDeducted" INTEGER NOT NULL,
  "refundedCredits" INTEGER NOT NULL DEFAULT 0,
  "checkedInAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reservations_valid_range" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "reservations_nonnegative_credits" CHECK ("creditsDeducted" >= 0 AND "refundedCredits" >= 0)
);

CREATE TABLE "membership_plans" (
  "id" "PlanTier" NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyCredits" INTEGER NOT NULL,
  "pricePerMonth" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT NOT NULL,
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" "PlanTier" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_valid_period" CHECK ("currentPeriodStart" < "currentPeriodEnd")
);

CREATE TABLE "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallets_nonnegative_balance" CHECK ("balance" >= 0)
);

CREATE TABLE "wallet_transactions" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_transactions_nonnegative_balance" CHECK ("balanceAfter" >= 0)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE UNIQUE INDEX "operating_hours_siteId_dayOfWeek_key" ON "operating_hours"("siteId", "dayOfWeek");
CREATE INDEX "maintenance_blocks_resourceId_startsAt_endsAt_idx" ON "maintenance_blocks"("resourceId", "startsAt", "endsAt");
CREATE INDEX "holds_resourceId_startsAt_endsAt_idx" ON "holds"("resourceId", "startsAt", "endsAt");
CREATE INDEX "holds_expiration_idx" ON "holds"("status", "expiresAt");
CREATE INDEX "reservations_resourceId_startsAt_endsAt_idx" ON "reservations"("resourceId", "startsAt", "endsAt");
CREATE INDEX "reservations_userId_status_idx" ON "reservations"("userId", "status");
CREATE INDEX "reservations_no_show_idx" ON "reservations"("status", "startsAt");
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE INDEX "subscriptions_cycle_idx" ON "subscriptions"("status", "currentPeriodEnd");
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");
CREATE INDEX "wallet_transactions_userId_createdAt_idx" ON "wallet_transactions"("userId", "createdAt");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_staff" ADD CONSTRAINT "site_staff_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_staff" ADD CONSTRAINT "site_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resources" ADD CONSTRAINT "resources_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_blocks" ADD CONSTRAINT "maintenance_blocks_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_blocks" ADD CONSTRAINT "maintenance_blocks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "holds" ADD CONSTRAINT "holds_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holds" ADD CONSTRAINT "holds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_active_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('CONFIRMED'::"ReservationStatus", 'CHECKED_IN'::"ReservationStatus"));

INSERT INTO "membership_plans"
  ("id", "name", "monthlyCredits", "pricePerMonth", "currency", "description", "features", "isPopular")
VALUES
  ('STARTER', 'Starter', 10, 29, 'PEN', 'Plan de entrada para uso flexible.', ARRAY['10 créditos mensuales'], false),
  ('PRO', 'Pro', 30, 79, 'PEN', 'Plan para profesionales y equipos pequeños.', ARRAY['30 créditos mensuales'], true),
  ('ENTERPRISE', 'Enterprise', 100, 199, 'PEN', 'Plan para equipos con alta demanda.', ARRAY['100 créditos mensuales'], false);

INSERT INTO "sites"
  ("id", "name", "address", "city", "openingTime", "closingTime", "timezone", "utcOffsetMinutes", "isActive", "createdAt", "updatedAt")
VALUES
  ('site_01', 'Coworking Miraflores', 'Av. José Larco 850, Miraflores', 'Lima', '08:00', '20:00', 'America/Lima', -300, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "operating_hours" ("id", "siteId", "dayOfWeek", "opensAt", "closesAt") VALUES
  ('hours_01_mon', 'site_01', 'MON', '08:00', '20:00'),
  ('hours_01_tue', 'site_01', 'TUE', '08:00', '20:00'),
  ('hours_01_wed', 'site_01', 'WED', '08:00', '20:00'),
  ('hours_01_thu', 'site_01', 'THU', '08:00', '20:00'),
  ('hours_01_fri', 'site_01', 'FRI', '08:00', '20:00'),
  ('hours_01_sat', 'site_01', 'SAT', '09:00', '18:00'),
  ('hours_01_sun', 'site_01', 'SUN', '09:00', '18:00');

INSERT INTO "resources"
  ("id", "siteId", "name", "type", "capacity", "creditCostAmount", "amenities", "isActive", "createdAt", "updatedAt")
VALUES
  ('res_01', 'site_01', 'Sala Andes', 'MEETING_ROOM', 6, 2, ARRAY['Pantalla', 'Pizarra', 'Videoconferencia'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('res_02', 'site_01', 'Hot Desk Flexible', 'HOT_DESK', 1, 1, ARRAY['WiFi', 'Silla ergonómica'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('res_03', 'site_01', 'Escritorio Dedicado', 'DEDICATED_DESK', 1, 30, ARRAY['Monitor', 'Casillero'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
