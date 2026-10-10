CREATE TABLE "payment_event" (
	"event_id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD COLUMN "provider_customer_ref" text;--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD COLUMN "provider_event_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "billing_subscription_ref_idx" ON "billing_subscription" USING btree ("provider_ref");