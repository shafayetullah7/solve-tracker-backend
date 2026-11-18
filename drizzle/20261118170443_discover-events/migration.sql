CREATE TABLE "discover_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"viewer_id" uuid NOT NULL,
	"event" text NOT NULL,
	"surface" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "discover_events_created_at_idx" ON "discover_events" ("created_at");--> statement-breakpoint
ALTER TABLE "discover_events" ADD CONSTRAINT "discover_events_viewer_id_users_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE;