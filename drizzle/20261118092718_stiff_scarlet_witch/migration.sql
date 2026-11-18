CREATE TABLE "risc_event_receipts" (
	"jti" text PRIMARY KEY,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_types" jsonb NOT NULL,
	"provider_subject" text,
	"user_id" uuid
);
--> statement-breakpoint
CREATE INDEX "risc_event_receipts_received_at_idx" ON "risc_event_receipts" ("received_at");--> statement-breakpoint
ALTER TABLE "risc_event_receipts" ADD CONSTRAINT "risc_event_receipts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;