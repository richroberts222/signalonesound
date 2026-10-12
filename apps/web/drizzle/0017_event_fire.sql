CREATE TABLE "event_fire" (
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_fire_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE INDEX "event_fire_event_idx" ON "event_fire" USING btree ("event_id");