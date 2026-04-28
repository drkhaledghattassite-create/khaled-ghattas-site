CREATE TYPE "public"."product_type" AS ENUM('BOOK', 'SESSION');--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "product_type" "product_type" DEFAULT 'BOOK' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferences" text;