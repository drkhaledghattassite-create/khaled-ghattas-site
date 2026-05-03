CREATE TYPE "public"."session_item_type" AS ENUM('VIDEO', 'AUDIO', 'PDF');--> statement-breakpoint
CREATE TABLE "media_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_item_id" uuid NOT NULL,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"last_watched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdf_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"last_page" integer DEFAULT 1 NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"item_type" "session_item_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"storage_key" text NOT NULL,
	"duration_seconds" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_progress" ADD CONSTRAINT "media_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_progress" ADD CONSTRAINT "media_progress_session_item_id_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."session_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_bookmarks" ADD CONSTRAINT "pdf_bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_bookmarks" ADD CONSTRAINT "pdf_bookmarks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_session_id_books_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_progress_user_idx" ON "media_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_progress_item_idx" ON "media_progress" USING btree ("session_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_progress_user_item_idx" ON "media_progress" USING btree ("user_id","session_item_id");--> statement-breakpoint
CREATE INDEX "pdf_bookmarks_user_idx" ON "pdf_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pdf_bookmarks_book_idx" ON "pdf_bookmarks" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "reading_progress_user_idx" ON "reading_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_progress_book_idx" ON "reading_progress" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_book_idx" ON "reading_progress" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "session_items_session_idx" ON "session_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_items_session_sort_idx" ON "session_items" USING btree ("session_id","sort_order");