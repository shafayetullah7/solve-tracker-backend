CREATE TABLE "learning_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"structure_revision" bigint DEFAULT 1 NOT NULL,
	"metadata_revision" bigint DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_guides_title_check" CHECK (length(btrim("title")) > 0),
	CONSTRAINT "learning_guides_revisions_check" CHECK ("structure_revision" > 0 and "metadata_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"completion_mode" text DEFAULT 'structural' NOT NULL,
	"content_revision" bigint DEFAULT 1 NOT NULL,
	"requirement_revision" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"deletion_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_nodes_parent_check" CHECK ("parent_id" is null or "parent_id" <> "id"),
	CONSTRAINT "learning_nodes_position_check" CHECK ("position" >= 0),
	CONSTRAINT "learning_nodes_title_check" CHECK (length(btrim("title")) > 0),
	CONSTRAINT "learning_nodes_mode_check" CHECK ("completion_mode" in ('structural', 'manual', 'gated')),
	CONSTRAINT "learning_nodes_revisions_check" CHECK ("content_revision" > 0 and "requirement_revision" > 0),
	CONSTRAINT "learning_nodes_deletion_check" CHECK (("deleted_at" is null) = ("deletion_batch_id" is null))
);
--> statement-breakpoint
CREATE TABLE "learning_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"guide_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"resume_node_id" uuid,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_operations" (
	"actor_id" uuid,
	"operation_id" uuid,
	"request_hash" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "learning_operations_pkey" PRIMARY KEY("actor_id","operation_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_guides_id_owner_uniq" ON "learning_guides" ("id","owner_id");--> statement-breakpoint
CREATE INDEX "learning_guides_owner_status_updated_idx" ON "learning_guides" ("owner_id","deleted_at","archived_at","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_nodes_guide_id_uniq" ON "learning_nodes" ("guide_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_nodes_root_position_uniq" ON "learning_nodes" ("guide_id","position") WHERE "parent_id" is null and "deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_nodes_child_position_uniq" ON "learning_nodes" ("guide_id","parent_id","position") WHERE "parent_id" is not null and "deleted_at" is null;--> statement-breakpoint
CREATE INDEX "learning_nodes_parent_idx" ON "learning_nodes" ("guide_id","parent_id");--> statement-breakpoint
CREATE INDEX "learning_nodes_deletion_batch_idx" ON "learning_nodes" ("guide_id","deletion_batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_enrollments_guide_learner_uniq" ON "learning_enrollments" ("guide_id","learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_enrollments_guide_id_uniq" ON "learning_enrollments" ("guide_id","id");--> statement-breakpoint
CREATE INDEX "learning_enrollments_learner_activity_idx" ON "learning_enrollments" ("learner_id","last_activity_at","id");--> statement-breakpoint
CREATE INDEX "learning_operations_expiry_idx" ON "learning_operations" ("expires_at");--> statement-breakpoint
ALTER TABLE "learning_guides" ADD CONSTRAINT "learning_guides_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_guide_id_learning_guides_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "learning_guides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_parent_fk" FOREIGN KEY ("guide_id","parent_id") REFERENCES "learning_nodes"("guide_id","id");--> statement-breakpoint
ALTER TABLE "learning_enrollments" ADD CONSTRAINT "learning_enrollments_owner_fk" FOREIGN KEY ("guide_id","learner_id") REFERENCES "learning_guides"("id","owner_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_enrollments" ADD CONSTRAINT "learning_enrollments_resume_fk" FOREIGN KEY ("guide_id","resume_node_id") REFERENCES "learning_nodes"("guide_id","id");--> statement-breakpoint
ALTER TABLE "learning_operations" ADD CONSTRAINT "learning_operations_actor_id_users_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE;