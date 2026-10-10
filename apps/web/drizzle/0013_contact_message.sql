CREATE TABLE "contact_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"name" text NOT NULL,
	"reply_email" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"address_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_message_created_idx" ON "contact_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_message_address_idx" ON "contact_message" USING btree ("address_key","created_at");