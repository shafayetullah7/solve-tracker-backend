ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle_changed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_lower_uniq" ON "users" (lower("handle")) WHERE "handle" is not null;