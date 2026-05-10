CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"intro_ar" text NOT NULL,
	"intro_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"description_en" text NOT NULL,
	"category" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"cover_image_url" text,
	"price_usd" numeric(10, 2),
	"is_paid" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"display_order" integer NOT NULL,
	"prompt_ar" text NOT NULL,
	"prompt_en" text NOT NULL,
	"explanation_ar" text,
	"explanation_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"display_order" integer NOT NULL,
	"label_ar" text NOT NULL,
	"label_en" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score_percentage" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempt_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_options" ADD CONSTRAINT "test_options_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempt_answers" ADD CONSTRAINT "test_attempt_answers_selected_option_id_test_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."test_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tests_slug_idx" ON "tests" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tests_published_idx" ON "tests" USING btree ("is_published","display_order","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tests_category_idx" ON "tests" USING btree ("category","is_published");--> statement-breakpoint
CREATE INDEX "test_questions_test_idx" ON "test_questions" USING btree ("test_id","display_order");--> statement-breakpoint
CREATE INDEX "test_options_question_idx" ON "test_options" USING btree ("question_id","display_order");--> statement-breakpoint
CREATE INDEX "test_attempts_user_idx" ON "test_attempts" USING btree ("user_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "test_attempts_test_idx" ON "test_attempts" USING btree ("test_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "test_attempts_user_test_idx" ON "test_attempts" USING btree ("user_id","test_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "test_attempt_answers_attempt_idx" ON "test_attempt_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "test_attempt_answers_question_idx" ON "test_attempt_answers" USING btree ("question_id");
