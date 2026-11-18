CREATE TABLE "user_follows" (
	"follower_id" uuid,
	"followee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_pkey" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "user_follows_no_self_follow" CHECK (follower_id <> followee_id)
);
--> statement-breakpoint
CREATE INDEX "user_follows_followee_id_idx" ON "user_follows" ("followee_id");--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_users_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE;