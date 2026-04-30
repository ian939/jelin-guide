-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "crewVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Place_crewVerified_idx" ON "Place"("crewVerified");

-- Backfill: 리뷰 1+ OR 제로페이 vote(YES) 1+ 가게는 crewVerified=true
UPDATE "Place" p
SET "crewVerified" = true
WHERE EXISTS (
  SELECT 1 FROM "Review" r
  WHERE r."placeId" = p.id AND r."isHidden" = false
)
   OR EXISTS (
  SELECT 1 FROM "ZeropayVote" v
  WHERE v."placeId" = p.id AND v."isAvailable" = true
);
