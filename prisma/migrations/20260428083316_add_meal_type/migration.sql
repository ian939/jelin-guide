-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('LUNCH', 'DINNER', 'OTHER');

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "mealType" "MealType" NOT NULL DEFAULT 'LUNCH';

-- AlterTable
ALTER TABLE "PlaceRevision" ADD COLUMN     "mealType" "MealType" NOT NULL DEFAULT 'LUNCH';

-- CreateIndex
CREATE INDEX "Place_mealType_idx" ON "Place"("mealType");
