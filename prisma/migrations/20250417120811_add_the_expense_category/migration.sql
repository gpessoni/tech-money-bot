/*
  Warnings:

  - You are about to drop the column `type` on the `Expense` table. All the data in the column will be lost.
  - Added the required column `category` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'EDUCACAO', 'MORADIA', 'LAZER', 'VESTUARIO', 'SERVICOS', 'IMPOSTOS', 'SEGUROS', 'PRESENTES', 'VIAGENS', 'OUTROS');

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "type",
ADD COLUMN     "category" "ExpenseCategory" NOT NULL;

-- DropEnum
DROP TYPE "ExpenseType";
