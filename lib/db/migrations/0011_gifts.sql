CREATE TYPE "public"."gift_status" AS ENUM('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."gift_item_type" AS ENUM('BOOK', 'SESSION', 'BOOKING', 'TEST');--> statement-breakpoint
CREATE TYPE "public"."gift_source" AS ENUM('ADMIN_GRANT', 'USER_PURCHASE');--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"source" "gift_source" NOT NULL,
	"status" "gift_status" DEFAULT 'PENDING' NOT NULL,
	"item_type" "gift_item_type" NOT NULL,
	"item_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"recipient_email" text NOT NULL,
	"recipient_user_id" uuid,
	"sender_message" text,
	"amount_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"claimed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"refunded_at" timestamp with time zone,
	"locale" text DEFAULT 'ar' NOT NULL,
	"admin_granted_by_user_id" uuid,
	"email_sent_at" timestamp with time zone,
	"email_send_failed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_admin_granted_by_user_id_user_id_fk" FOREIGN KEY ("admin_granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_id" uuid;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "gift_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_gift_id_gifts_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_gift_id_gifts_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gifts_token_idx" ON "gifts" USING btree ("token");--> statement-breakpoint
CREATE INDEX "gifts_recipient_email_idx" ON "gifts" USING btree ("recipient_email","status");--> statement-breakpoint
CREATE INDEX "gifts_recipient_user_idx" ON "gifts" USING btree ("recipient_user_id","status");--> statement-breakpoint
CREATE INDEX "gifts_sender_idx" ON "gifts" USING btree ("sender_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gifts_status_idx" ON "gifts" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "gifts_stripe_session_idx" ON "gifts" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "gifts_expires_idx" ON "gifts" USING btree ("expires_at");
