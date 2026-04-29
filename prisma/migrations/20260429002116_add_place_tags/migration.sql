-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PlaceRevision" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
