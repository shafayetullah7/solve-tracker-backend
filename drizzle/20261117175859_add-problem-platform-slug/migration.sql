ALTER TABLE "problems" ADD COLUMN "platform_slug" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
CREATE INDEX "problems_user_platform_slug_idx" ON "problems" ("user_id","platform_slug");