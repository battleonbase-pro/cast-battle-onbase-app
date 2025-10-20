-- Migration: Add missing tables for cast_likes and share_rewards
-- This migration adds the missing tables that are causing the 500 error

-- Create cast_likes table
CREATE TABLE IF NOT EXISTS "cast_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "castId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cast_likes_pkey" PRIMARY KEY ("id")
);

-- Create share_rewards table
CREATE TABLE IF NOT EXISTS "share_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 20,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "share_rewards_pkey" PRIMARY KEY ("id")
);

-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fid" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pfpUrl" TEXT;

-- Add missing columns to battles table
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "debateId" INTEGER;
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "insights" TEXT;
ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "thumbnail" TEXT;

-- Add foreign key constraints for cast_likes
ALTER TABLE "cast_likes" ADD CONSTRAINT "cast_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cast_likes" ADD CONSTRAINT "cast_likes_castId_fkey" FOREIGN KEY ("castId") REFERENCES "casts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for share_rewards
ALTER TABLE "share_rewards" ADD CONSTRAINT "share_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_rewards" ADD CONSTRAINT "share_rewards_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "cast_likes" ADD CONSTRAINT "cast_likes_userId_castId_key" UNIQUE ("userId", "castId");
ALTER TABLE "share_rewards" ADD CONSTRAINT "share_rewards_userId_battleId_platform_key" UNIQUE ("userId", "battleId", "platform");
