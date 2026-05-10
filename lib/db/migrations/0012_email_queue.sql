CREATE TYPE "public"."email_status" AS ENUM('PENDING', 'SENDING', 'SENT', 'FAILED', 'EXHAUSTED');--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text NOT NULL,
	"from_address" text NOT NULL,
	"reply_to" text,
	"status" "email_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error" text,
	"resend_message_id" text,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_queue_pending_idx" ON "email_queue" USING btree ("status","next_attempt_at") WHERE "email_queue"."status" IN ('PENDING','SENDING');--> statement-breakpoint
CREATE INDEX "email_queue_status_created_idx" ON "email_queue" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_queue_recipient_idx" ON "email_queue" USING btree ("recipient_email","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_queue_related_idx" ON "email_queue" USING btree ("related_entity_type","related_entity_id");
