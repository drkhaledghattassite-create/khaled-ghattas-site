CREATE TYPE "public"."booking_product_type" AS ENUM('RECONSIDER_COURSE', 'ONLINE_SESSION');--> statement-breakpoint
CREATE TYPE "public"."booking_state" AS ENUM('OPEN', 'CLOSED', 'SOLD_OUT');--> statement-breakpoint
CREATE TABLE "tours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"city_ar" text NOT NULL,
	"city_en" text NOT NULL,
	"country_ar" text NOT NULL,
	"country_en" text NOT NULL,
	"region_ar" text,
	"region_en" text,
	"date" timestamp with time zone NOT NULL,
	"venue_ar" text,
	"venue_en" text,
	"description_ar" text,
	"description_en" text,
	"external_booking_url" text,
	"cover_image" text,
	"attended_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"suggested_city" text NOT NULL,
	"suggested_country" text NOT NULL,
	"additional_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"product_type" "booking_product_type" NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"description_en" text NOT NULL,
	"cover_image" text,
	"price_usd" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"next_cohort_date" timestamp with time zone,
	"cohort_label_ar" text,
	"cohort_label_en" text,
	"duration_minutes" integer,
	"format_ar" text,
	"format_en" text,
	"max_capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"booking_state" "booking_state" DEFAULT 'CLOSED' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"additional_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bookings_pending_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"stripe_session_id" text,
	"expires_at" timestamp with time zone DEFAULT (now() + interval '15 minutes') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"booking_id" uuid NOT NULL,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"amount_paid" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tour_suggestions" ADD CONSTRAINT "tour_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_interest" ADD CONSTRAINT "booking_interest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_interest" ADD CONSTRAINT "booking_interest_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings_pending_holds" ADD CONSTRAINT "bookings_pending_holds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings_pending_holds" ADD CONSTRAINT "bookings_pending_holds_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tours_slug_idx" ON "tours" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tours_active_date_idx" ON "tours" USING btree ("is_active","date");--> statement-breakpoint
CREATE INDEX "tour_suggestions_user_idx" ON "tour_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slug_idx" ON "bookings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "bookings_active_idx" ON "bookings" USING btree ("product_type","booking_state","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_interest_user_booking_idx" ON "booking_interest" USING btree ("user_id","booking_id");--> statement-breakpoint
CREATE INDEX "booking_interest_created_idx" ON "booking_interest" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_pending_holds_booking_expires_idx" ON "bookings_pending_holds" USING btree ("booking_id","expires_at");--> statement-breakpoint
CREATE INDEX "bookings_pending_holds_user_booking_idx" ON "bookings_pending_holds" USING btree ("user_id","booking_id");--> statement-breakpoint
CREATE INDEX "bookings_pending_holds_stripe_session_idx" ON "bookings_pending_holds" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_orders_stripe_session_idx" ON "booking_orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "booking_orders_user_booking_idx" ON "booking_orders" USING btree ("user_id","booking_id");
