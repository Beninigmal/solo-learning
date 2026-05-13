-- Add nivel, batchId and ordem columns to Quest for 3-question progressive sequences
ALTER TABLE "Quest" ADD COLUMN "nivel" TEXT NOT NULL DEFAULT 'FACIL';
ALTER TABLE "Quest" ADD COLUMN "batchId" TEXT;
ALTER TABLE "Quest" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 1;
