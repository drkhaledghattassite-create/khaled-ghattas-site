-- Phase B (post-launch) — in-product answer composer.
--
-- Adds the answer body that Dr. Khaled writes inside the admin queue. The
-- existing `answer_reference` column stays as the optional outbound link
-- (Instagram reel, YouTube clip, etc.); `answer_body` is the in-product
-- prose reply that ships to the asker via email and renders on /dashboard/ask.
--
-- Nullable + no default so legacy rows answered with a reference-only stay
-- semantically correct (no body == no in-product prose).

ALTER TABLE "user_questions" ADD COLUMN "answer_body" text;
