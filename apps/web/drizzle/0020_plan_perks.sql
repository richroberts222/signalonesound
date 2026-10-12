CREATE TABLE "billing_perk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"account_type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_perk_key_unique" UNIQUE("key"),
	CONSTRAINT "billing_perk_key_shape" CHECK ("billing_perk"."key" ~ '^[a-z][a-z0-9_]{2,39}$')
);
--> statement-breakpoint
CREATE TABLE "billing_plan_perk" (
	"plan_id" uuid NOT NULL,
	"perk_id" uuid NOT NULL,
	CONSTRAINT "billing_plan_perk_plan_id_perk_id_pk" PRIMARY KEY("plan_id","perk_id")
);
