CREATE TYPE "problem_status" AS ENUM('unsolved', 'solved');--> statement-breakpoint
CREATE TABLE "problem_topics" (
	"problem_id" uuid,
	"topic_id" uuid,
	CONSTRAINT "problem_topics_pkey" PRIMARY KEY("problem_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"platform_problem_id" text,
	"difficulty" text,
	"rating" integer,
	"notes" text,
	"status" "problem_status" DEFAULT 'unsolved'::"problem_status" NOT NULL,
	"solved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "problem_topics_topic_idx" ON "problem_topics" ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "problems_user_normalized_url_uniq" ON "problems" ("user_id","normalized_url");--> statement-breakpoint
CREATE INDEX "problems_user_idx" ON "problems" ("user_id");--> statement-breakpoint
ALTER TABLE "problem_topics" ADD CONSTRAINT "problem_topics_problem_id_problems_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problem_topics" ADD CONSTRAINT "problem_topics_topic_id_topics_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;