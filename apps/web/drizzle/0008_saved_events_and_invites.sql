CREATE TABLE "invite_token" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"arrivals" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_event" (
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_event_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE INDEX "invite_token_creator_idx" ON "invite_token" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "saved_event_event_idx" ON "saved_event" USING btree ("event_id");