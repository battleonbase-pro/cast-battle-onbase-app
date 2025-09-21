-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "durationHours" REAL NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 1000,
    "debatePoints" JSONB NOT NULL,
    "overallScore" INTEGER,
    "balanceScore" INTEGER,
    "complexity" TEXT,
    "controversyLevel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "battle_participations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "battle_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "battle_participations_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "casts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "qualityScore" INTEGER,
    "relevanceScore" INTEGER,
    "isAppropriate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "casts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "casts_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "battle_wins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prize" TEXT,
    CONSTRAINT "battle_wins_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "battle_wins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "battle_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "battleId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalParticipants" INTEGER NOT NULL,
    "totalCasts" INTEGER NOT NULL,
    "winnerAddress" TEXT,
    CONSTRAINT "battle_history_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "battle_participations_userId_battleId_key" ON "battle_participations"("userId", "battleId");

-- CreateIndex
CREATE UNIQUE INDEX "battle_wins_battleId_position_key" ON "battle_wins"("battleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "battle_history_battleId_key" ON "battle_history"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");
