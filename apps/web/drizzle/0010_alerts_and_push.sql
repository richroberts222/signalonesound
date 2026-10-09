CREATE TABLE "alert_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"place_label" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"radius_miles" integer,
	"timeframe_days" integer NOT NULL,
	"types" text DEFAULT '' NOT NULL,
	"immediate" boolean DEFAULT false NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"channel" text NOT NULL,
	"event_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"dedupe_key" text NOT NULL,
	"send_after" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "notification_queue_dedupe_unique" UNIQUE("user_id","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "org_mute" (
	"user_id" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_mute_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "push_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "alert_rule_user_idx" ON "alert_rule" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_queue_due_idx" ON "notification_queue" USING btree ("status","send_after");--> statement-breakpoint
CREATE INDEX "notification_queue_user_idx" ON "notification_queue" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE INDEX "push_token_user_idx" ON "push_token" USING btree ("user_id");