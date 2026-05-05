CREATE TYPE "public"."corporate_request_status" AS ENUM('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "corporate_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"description_en" text NOT NULL,
	"duration_ar" text,
	"duration_en" text,
	"audience_ar" text,
	"audience_en" text,
	"cover_image" text,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"logo_url" text NOT NULL,
	"website_url" text,
	"status" "content_status" DEFAULT 'PUBLISHED' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organization" text NOT NULL,
	"position" text,
	"program_id" uuid,
	"preferred_date" text,
	"attendee_count" integer,
	"message" text,
	"status" "corporate_request_status" DEFAULT 'NEW' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_requests" ADD CONSTRAINT "corporate_requests_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_programs_slug_idx" ON "corporate_programs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "corporate_requests_status_idx" ON "corporate_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "corporate_requests_program_idx" ON "corporate_requests" USING btree ("program_id");
