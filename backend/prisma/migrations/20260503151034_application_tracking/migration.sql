/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `Application` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,externalId]` on the table `Application` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalId` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postedAt` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_jobId_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "createdAt",
DROP COLUMN "jobId",
ADD COLUMN     "company" TEXT NOT NULL,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "postedAt" TEXT NOT NULL,
ADD COLUMN     "remote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_externalId_key" ON "Application"("userId", "externalId");
