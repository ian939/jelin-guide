-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "avgScore" DOUBLE PRECISION,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: 기존 가게의 reviewCount·avgScore를 현재 review 데이터에서 계산해서 채움
UPDATE "Place" p
SET
  "reviewCount" = sub.cnt,
  "avgScore" = sub.avg
FROM (
  SELECT
    "placeId",
    COUNT(*) AS cnt,
    AVG(("scoreTaste" + "scoreValue" + "scoreAtmosphere") / 3.0) AS avg
  FROM "Review"
  WHERE "isHidden" = false
  GROUP BY "placeId"
) sub
WHERE p.id = sub."placeId";
