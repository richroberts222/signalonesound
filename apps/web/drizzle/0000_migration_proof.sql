CREATE TABLE "migration_proof" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "migration_proof_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"note" text DEFAULT 'migration-proof' NOT NULL
);
