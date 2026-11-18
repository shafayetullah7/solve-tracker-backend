ALTER TABLE "users" ADD COLUMN "practice_visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "practice_goal" text;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_practice_visibility_check" CHECK ("practice_visibility" in ('private', 'summary', 'topics'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_practice_goal_check" CHECK ("practice_goal" is null or "practice_goal" in ('interview', 'contests', 'fundamentals', 'coaching'));--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_description_len" CHECK (char_length("description") <= 280);