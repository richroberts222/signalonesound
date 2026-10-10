CREATE TABLE "billing_coupon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"percent_off" integer,
	"amount_off_minor" integer,
	"currency" text,
	"expires_at" timestamp with time zone,
	"max_redemptions" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_coupon_code_unique" UNIQUE("code"),
	CONSTRAINT "billing_coupon_one_kind" CHECK (("billing_coupon"."percent_off" is null) <> ("billing_coupon"."amount_off_minor" is null)),
	CONSTRAINT "billing_coupon_percent_range" CHECK ("billing_coupon"."percent_off" is null or "billing_coupon"."percent_off" between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "billing_coupon_use" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"account_type" text NOT NULL,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_coupon_use_unique" UNIQUE("coupon_id","account_type","account_id")
);
--> statement-breakpoint
CREATE TABLE "billing_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_type" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"interval" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_price_amount_range" CHECK ("billing_price"."amount_minor" between 0 and 1000000)
);
--> statement-breakpoint
CREATE TABLE "billing_rule" (
	"account_type" text PRIMARY KEY NOT NULL,
	"payment_required" boolean DEFAULT false NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"default_plan_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_rule_trial_days_range" CHECK ("billing_rule"."trial_days" between 0 and 365)
);
--> statement-breakpoint
CREATE TABLE "billing_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_type" text NOT NULL,
	"account_id" text NOT NULL,
	"plan_id" uuid,
	"price_id" uuid,
	"status" text NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"provider_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_subscription_account_unique" UNIQUE("account_type","account_id")
);
--> statement-breakpoint
CREATE INDEX "billing_plan_type_idx" ON "billing_plan" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "billing_price_plan_idx" ON "billing_price" USING btree ("plan_id","created_at");

--> statement-breakpoint
-- Defaults: nobody pays until an admin turns payment on (S10 AC2).
INSERT INTO "billing_rule" ("account_type", "payment_required", "trial_days") VALUES ('member', false, 0), ('organization', false, 0) ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- The proposals from the product plan's pricing vote, created INACTIVE so nothing charges until an admin activates them (S10 AC7).
WITH monthly AS (INSERT INTO "billing_plan" ("account_type", "name", "active") VALUES ('member', 'Member, monthly (proposed)', false) RETURNING "id"), yearly AS (INSERT INTO "billing_plan" ("account_type", "name", "active") VALUES ('member', 'Member, yearly (proposed)', false) RETURNING "id"), month_price AS (INSERT INTO "billing_price" ("plan_id", "interval", "amount_minor", "currency") SELECT "id", 'month', 300, 'usd' FROM monthly) INSERT INTO "billing_price" ("plan_id", "interval", "amount_minor", "currency") SELECT "id", 'year', 3000, 'usd' FROM yearly;
