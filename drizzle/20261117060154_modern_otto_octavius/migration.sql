CREATE TYPE "media_resource_type" AS ENUM('image');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"usage_count" smallint DEFAULT 0 NOT NULL,
	"provider" text DEFAULT 'cloudinary' NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" "media_resource_type" DEFAULT 'image'::"media_resource_type" NOT NULL,
	"extension" text NOT NULL,
	"meta" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_usage_count_range" CHECK ("usage_count" >= 0 AND "usage_count" <= 2)
);
--> statement-breakpoint
CREATE TABLE "user_education_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"program" text NOT NULL,
	"end_year" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_work_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"organization" text NOT NULL,
	"role" text NOT NULL,
	"period" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_media_id" uuid;--> statement-breakpoint
CREATE INDEX "media_user_idx" ON "media" ("user_id");--> statement-breakpoint
CREATE INDEX "media_user_usage_idx" ON "media" ("user_id","usage_count");--> statement-breakpoint
CREATE INDEX "user_education_entries_user_idx" ON "user_education_entries" ("user_id");--> statement-breakpoint
CREATE INDEX "user_work_entries_user_idx" ON "user_work_entries" ("user_id");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_education_entries" ADD CONSTRAINT "user_education_entries_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_work_entries" ADD CONSTRAINT "user_work_entries_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;