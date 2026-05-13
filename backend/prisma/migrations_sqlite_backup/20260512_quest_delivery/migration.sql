-- Add nickname column to User (was missing from init migration)
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;

-- CreateIndex for nickname unique
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- Add windowEnd to Quest (replaces expiresAt for global window tracking)
ALTER TABLE "Quest" ADD COLUMN "windowEnd" DATETIME;

-- CreateTable QuestDelivery
CREATE TABLE "QuestDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" DATETIME NOT NULL,
    "deliveredAt" DATETIME,
    "waitingSince" DATETIME,
    "expiresAt" DATETIME,
    "answeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestDelivery_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex for QuestDelivery unique constraint (one delivery per quest per user)
CREATE UNIQUE INDEX "QuestDelivery_questId_userId_key" ON "QuestDelivery"("questId", "userId");
