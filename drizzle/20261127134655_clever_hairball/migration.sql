CREATE TABLE "learning_import_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"source_kind" text NOT NULL,
	"source_sha256" text NOT NULL,
	"normalized_payload" jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "learning_import_previews_owner_idx" ON "learning_import_previews" ("owner_id");--> statement-breakpoint
CREATE INDEX "learning_import_previews_expires_idx" ON "learning_import_previews" ("expires_at");--> statement-breakpoint
ALTER TABLE "learning_import_previews" ADD CONSTRAINT "learning_import_previews_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_blocks" DROP CONSTRAINT "learning_blocks_type_check", ADD CONSTRAINT "learning_blocks_type_check" CHECK ("type" in ('text', 'code', 'checklist', 'link'));