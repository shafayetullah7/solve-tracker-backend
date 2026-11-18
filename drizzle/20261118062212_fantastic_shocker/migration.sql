CREATE TABLE "auth_provider_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"provider_email" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_provider_identities_provider_google" CHECK ("provider" = 'google')
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_provider_identities_provider_subject_uniq" ON "auth_provider_identities" ("provider","provider_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_provider_identities_user_provider_uniq" ON "auth_provider_identities" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "auth_provider_identities_user_idx" ON "auth_provider_identities" ("user_id");--> statement-breakpoint
ALTER TABLE "auth_provider_identities" ADD CONSTRAINT "auth_provider_identities_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;