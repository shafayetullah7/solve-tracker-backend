ALTER TYPE "learning_block_type" ADD VALUE 'problem';--> statement-breakpoint
CREATE TABLE "learning_problem_links" (
	"block_id" uuid PRIMARY KEY,
	"guide_id" uuid NOT NULL,
	"normalized_url" text NOT NULL,
	"display_url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_problem_links" ADD CONSTRAINT "learning_problem_links_block_fk" FOREIGN KEY ("guide_id","block_id") REFERENCES "learning_blocks"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_problem_links" ADD CONSTRAINT "learning_problem_links_guide_fk" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;