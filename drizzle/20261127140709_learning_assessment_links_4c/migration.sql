ALTER TYPE "learning_block_type" ADD VALUE 'assessment';--> statement-breakpoint
CREATE UNIQUE INDEX "learning_blocks_guide_id_uniq" ON "learning_blocks" USING btree ("guide_id","id");--> statement-breakpoint
CREATE TABLE "learning_assessment_links" (
	"block_id" uuid PRIMARY KEY,
	"guide_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_assessment_links" ADD CONSTRAINT "learning_assessment_links_block_fk" FOREIGN KEY ("guide_id","block_id") REFERENCES "learning_blocks"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_assessment_links" ADD CONSTRAINT "learning_assessment_links_assessment_fk" FOREIGN KEY ("guide_id","assessment_id") REFERENCES "learning_assessments"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_assessment_links" ADD CONSTRAINT "learning_assessment_links_guide_fk" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;