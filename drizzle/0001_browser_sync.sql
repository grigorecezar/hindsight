ALTER TYPE "public"."run_kind" ADD VALUE 'BROWSER_SYNC';--> statement-breakpoint
ALTER TYPE "public"."run_trigger" ADD VALUE 'EXTENSION';--> statement-breakpoint
ALTER TABLE "sync_states" ADD COLUMN "covered_from" timestamp with time zone;