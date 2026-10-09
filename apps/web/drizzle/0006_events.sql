CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"series_id" uuid,
	"is_exception" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"moderation_state" text DEFAULT 'published' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"time_zone" text NOT NULL,
	"venue_name" text NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"speakers" text,
	"directions" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "event_link_position_unique" UNIQUE("event_id","position")
);
--> statement-breakpoint
CREATE TABLE "event_revival_type" (
	"event_id" uuid NOT NULL,
	"type_slug" text NOT NULL,
	CONSTRAINT "event_revival_type_event_id_type_slug_pk" PRIMARY KEY("event_id","type_slug")
);
--> statement-breakpoint
CREATE TABLE "event_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_record_user_key_unique" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE INDEX "event_org_start_idx" ON "event" USING btree ("org_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "event_series_idx" ON "event" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "event_start_idx" ON "event" USING btree ("starts_at","id");