/*
  Warnings:

  - Added the required column `type` to the `Incomes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('SALARY', 'FREELANCE', 'INVESTMENT', 'RENT', 'OTHER');

-- AlterTable
ALTER TABLE "Incomes" ADD COLUMN     "type" "IncomeType" NOT NULL;
