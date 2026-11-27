CREATE TYPE "learning_question_kind" AS ENUM('single_choice', 'true_false', 'multiple_choice', 'numerical');--> statement-breakpoint
CREATE TYPE "learning_assessment_feedback_policy" AS ENUM('never', 'after_submit');--> statement-breakpoint
CREATE TABLE "learning_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"title" text NOT NULL,
	"active_revision_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_assessments_title_check" CHECK (length(btrim("title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_assessment_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"passing_basis_points" integer DEFAULT 7000 NOT NULL,
	"grading_policy_version" integer DEFAULT 1 NOT NULL,
	"feedback_policy" "learning_assessment_feedback_policy" DEFAULT 'after_submit'::"learning_assessment_feedback_policy" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_assessment_revisions_number_check" CHECK ("revision_number" >= 0),
	CONSTRAINT "learning_assessment_revisions_passing_check" CHECK ("passing_basis_points" >= 0 and "passing_basis_points" <= 10000),
	CONSTRAINT "learning_assessment_revisions_policy_check" CHECK ("grading_policy_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "learning_question_kind" NOT NULL,
	"prompt" jsonb NOT NULL,
	"grading_config" jsonb NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "learning_questions_position_check" CHECK ("position" >= 0),
	CONSTRAINT "learning_questions_points_check" CHECK ("points" > 0 and "points" <= 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_assessments_guide_id_uniq" ON "learning_assessments" ("guide_id","id");--> statement-breakpoint
CREATE INDEX "learning_assessments_guide_idx" ON "learning_assessments" ("guide_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_assessment_revisions_assessment_rev_uniq" ON "learning_assessment_revisions" ("assessment_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_assessment_revisions_guide_rev_uniq" ON "learning_assessment_revisions" ("guide_id","assessment_id","id");--> statement-breakpoint
CREATE INDEX "learning_assessment_revisions_assessment_idx" ON "learning_assessment_revisions" ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_questions_revision_position_uniq" ON "learning_questions" ("revision_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_questions_revision_id_uniq" ON "learning_questions" ("revision_id","id");--> statement-breakpoint
ALTER TABLE "learning_assessments" ADD CONSTRAINT "learning_assessments_guide_id_learning_guides_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_assessment_revisions" ADD CONSTRAINT "learning_assessment_revisions_guide_assessment_fk" FOREIGN KEY ("guide_id","assessment_id") REFERENCES "learning_assessments"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_assessment_revisions" ADD CONSTRAINT "learning_assessment_revisions_guide_fk" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_questions" ADD CONSTRAINT "learning_questions_revision_fk" FOREIGN KEY ("guide_id","assessment_id","revision_id") REFERENCES "learning_assessment_revisions"("guide_id","assessment_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_questions" ADD CONSTRAINT "learning_questions_assessment_fk" FOREIGN KEY ("guide_id","assessment_id") REFERENCES "learning_assessments"("guide_id","id") ON DELETE CASCADE;