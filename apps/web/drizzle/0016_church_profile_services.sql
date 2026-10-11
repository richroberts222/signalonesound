CREATE TABLE "church_profile" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"zip" text DEFAULT '' NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"time_zone" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"label" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "church_service_position_unique" UNIQUE("org_id","position")
);
--> statement-breakpoint
CREATE INDEX "church_service_org_idx" ON "church_service" USING btree ("org_id");