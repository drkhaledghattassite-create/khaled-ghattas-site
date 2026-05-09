CREATE TYPE "public"."question_status" AS ENUM('PENDING', 'ANSWERED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "user_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"status" "question_status" DEFAULT 'PENDING' NOT NULL,
	"answer_reference" text,
	"answered_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_questions_user_idx" ON "user_questions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_questions_status_idx" ON "user_questions" USING btree ("status","created_at" DESC NULLS LAST);
