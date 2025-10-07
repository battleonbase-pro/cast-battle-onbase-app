-- CreateEnum
CREATE TYPE "public"."BattleStatus" AS ENUM ('PREPARING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CastSide" AS ENUM ('SUPPORT', 'OPPOSE');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "username" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."battles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" "public"."BattleStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 1000,
    "debatePoints" JSONB NOT NULL,
    "overallScore" INTEGER,
    "balanceScore" INTEGER,
    "complexity" TEXT,
    "controversyLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."battle_participations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."casts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "side" "public"."CastSide" NOT NULL,
    "qualityScore" INTEGER,
    "relevanceScore" INTEGER,
    "isAppropriate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."battle_wins" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prize" TEXT,

    CONSTRAINT "battle_wins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."battle_history" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalParticipants" INTEGER NOT NULL,
    "totalCasts" INTEGER NOT NULL,
    "winnerAddress" TEXT,

    CONSTRAINT "battle_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shared_state" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rateLimitCooldown" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "public"."users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "battle_participations_userId_battleId_key" ON "public"."battle_participations"("userId", "battleId");

-- CreateIndex
CREATE UNIQUE INDEX "battle_wins_battleId_position_key" ON "public"."battle_wins"("battleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "battle_history_battleId_key" ON "public"."battle_history"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "public"."system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "shared_state_key_key" ON "public"."shared_state"("key");

-- AddForeignKey
ALTER TABLE "public"."battle_participations" ADD CONSTRAINT "battle_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."battle_participations" ADD CONSTRAINT "battle_participations_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "public"."battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."casts" ADD CONSTRAINT "casts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."casts" ADD CONSTRAINT "casts_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "public"."battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."battle_wins" ADD CONSTRAINT "battle_wins_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "public"."battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."battle_wins" ADD CONSTRAINT "battle_wins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."battle_history" ADD CONSTRAINT "battle_history_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "public"."battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
