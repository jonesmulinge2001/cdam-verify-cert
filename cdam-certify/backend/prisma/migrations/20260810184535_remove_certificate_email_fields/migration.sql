/*
  Warnings:

  - You are about to drop the column `emailBouncedAt` on the `certificates` table. All the data in the column will be lost.
  - You are about to drop the column `emailSentAt` on the `certificates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "emailBouncedAt",
DROP COLUMN "emailSentAt";
