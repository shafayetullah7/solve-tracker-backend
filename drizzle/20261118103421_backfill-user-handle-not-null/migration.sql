UPDATE "users" SET "handle" = 'u' || substr(replace("id"::text, '-', ''), 1, 23) WHERE "handle" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
DROP INDEX "users_handle_lower_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_lower_uniq" ON "users" (lower("handle"));