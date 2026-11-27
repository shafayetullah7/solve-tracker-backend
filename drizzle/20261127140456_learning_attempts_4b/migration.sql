CREATE TYPE "learning_attempt_status" AS ENUM('in_progress', 'finalized');--> statement-breakpoint
CREATE TABLE "learning_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"status" "learning_attempt_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"earned_points" integer,
	"possible_points" integer,
	"score_basis_points" integer,
	"revision" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_attempts_revision_check" CHECK ("revision" > 0),
	CONSTRAINT "learning_attempts_score_check" CHECK (("status" <> 'finalized'::learning_attempt_status) or ("score_basis_points" is not null and "possible_points" is not null and "possible_points" > 0))
);
--> statement-breakpoint
CREATE TABLE "learning_answers" (
	"attempt_id" uuid,
	"question_id" uuid,
	"revision_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"awarded_points" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_answers_pkey" PRIMARY KEY("attempt_id","question_id"),
	CONSTRAINT "learning_answers_points_check" CHECK ("awarded_points" is null or ("awarded_points" >= 0 and "awarded_points" <= 100))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_attempts_active_uniq" ON "learning_attempts" ("enrollment_id","assessment_id") WHERE "status" = 'in_progress'::learning_attempt_status;--> statement-breakpoint
CREATE INDEX "learning_attempts_enrollment_idx" ON "learning_attempts" ("enrollment_id","assessment_id");--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_enrollment_fk" FOREIGN KEY ("guide_id","enrollment_id") REFERENCES "learning_enrollments"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_guide_assessment_fk" FOREIGN KEY ("guide_id","assessment_id") REFERENCES "learning_assessments"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_revision_fk" FOREIGN KEY ("guide_id","assessment_id","revision_id") REFERENCES "learning_assessment_revisions"("guide_id","assessment_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_guide_fk" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_answers" ADD CONSTRAINT "learning_answers_attempt_fk" FOREIGN KEY ("attempt_id") REFERENCES "learning_attempts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_answers" ADD CONSTRAINT "learning_answers_question_fk" FOREIGN KEY ("revision_id","question_id") REFERENCES "learning_questions"("revision_id","id") ON DELETE CASCADE;