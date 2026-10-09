CREATE TABLE "hello_note" (
	"user_id" text PRIMARY KEY NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
