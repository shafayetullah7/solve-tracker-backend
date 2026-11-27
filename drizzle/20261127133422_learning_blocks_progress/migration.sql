CREATE TABLE "learning_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"activity_revision" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_blocks_position_check" CHECK ("position" >= 0),
	CONSTRAINT "learning_blocks_type_check" CHECK ("type" in ('text', 'code', 'checklist')),
	CONSTRAINT "learning_blocks_schema_version_check" CHECK ("schema_version" > 0),
	CONSTRAINT "learning_blocks_activity_revision_check" CHECK ("activity_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_node_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"enrollment_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_blocks_node_position_uniq" ON "learning_blocks" ("guide_id","node_id","position");--> statement-breakpoint
CREATE INDEX "learning_blocks_node_idx" ON "learning_blocks" ("guide_id","node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_node_progress_enrollment_node_uniq" ON "learning_node_progress" ("enrollment_id","node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_node_progress_guide_id_uniq" ON "learning_node_progress" ("guide_id","id");--> statement-breakpoint
ALTER TABLE "learning_blocks" ADD CONSTRAINT "learning_blocks_node_fk" FOREIGN KEY ("guide_id","node_id") REFERENCES "learning_nodes"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_blocks" ADD CONSTRAINT "learning_blocks_guide_fk" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_node_progress" ADD CONSTRAINT "learning_node_progress_enrollment_fk" FOREIGN KEY ("guide_id","enrollment_id") REFERENCES "learning_enrollments"("guide_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_node_progress" ADD CONSTRAINT "learning_node_progress_node_fk" FOREIGN KEY ("guide_id","node_id") REFERENCES "learning_nodes"("guide_id","id") ON DELETE CASCADE;