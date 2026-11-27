CREATE TYPE "practice_goal" AS ENUM('interview', 'contests', 'fundamentals', 'coaching');--> statement-breakpoint
CREATE TYPE "practice_visibility" AS ENUM('private', 'summary', 'topics');--> statement-breakpoint
CREATE TYPE "auth_provider" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "learning_block_type" AS ENUM('text', 'code', 'checklist', 'link');--> statement-breakpoint
CREATE TYPE "learning_node_completion_mode" AS ENUM('structural', 'manual', 'gated');--> statement-breakpoint
CREATE TYPE "learning_import_source_kind" AS ENUM('markdown', 'json', 'bundle');--> statement-breakpoint
ALTER TABLE "auth_provider_identities" DROP CONSTRAINT "auth_provider_identities_provider_google";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_practice_visibility_check";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_practice_goal_check";--> statement-breakpoint
ALTER TABLE "learning_nodes" DROP CONSTRAINT "learning_nodes_mode_check";--> statement-breakpoint
ALTER TABLE "learning_blocks" DROP CONSTRAINT "learning_blocks_type_check";--> statement-breakpoint
ALTER TABLE "auth_provider_identities" ALTER COLUMN "provider" SET DATA TYPE "auth_provider" USING "provider"::"auth_provider";--> statement-breakpoint
DROP INDEX "discover_user_visibility_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "practice_visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "practice_visibility" SET DATA TYPE "practice_visibility" USING "practice_visibility"::"practice_visibility";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "practice_visibility" SET DEFAULT 'private'::"practice_visibility";--> statement-breakpoint
CREATE INDEX "discover_user_visibility_idx" ON "users" ("id") WHERE "users"."practice_visibility" <> 'private'::"practice_visibility";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "practice_goal" SET DATA TYPE "practice_goal" USING "practice_goal"::"practice_goal";--> statement-breakpoint
ALTER TABLE "learning_nodes" ALTER COLUMN "completion_mode" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "learning_nodes" ALTER COLUMN "completion_mode" SET DATA TYPE "learning_node_completion_mode" USING "completion_mode"::"learning_node_completion_mode";--> statement-breakpoint
ALTER TABLE "learning_nodes" ALTER COLUMN "completion_mode" SET DEFAULT 'structural'::"learning_node_completion_mode";--> statement-breakpoint
ALTER TABLE "learning_blocks" ALTER COLUMN "type" SET DATA TYPE "learning_block_type" USING "type"::"learning_block_type";--> statement-breakpoint
ALTER TABLE "learning_import_previews" ALTER COLUMN "source_kind" SET DATA TYPE "learning_import_source_kind" USING "source_kind"::"learning_import_source_kind";