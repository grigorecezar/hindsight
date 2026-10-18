CREATE TABLE "author_sync_states" (
	"source" text NOT NULL,
	"author_id" uuid NOT NULL,
	"backfilled_at" timestamp with time zone,
	"covered_from" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"latest_published_at" timestamp with time zone,
	CONSTRAINT "author_sync_states_source_author_id_pk" PRIMARY KEY("source","author_id")
);
--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "followed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "favorited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "watched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "author_sync_states" ADD CONSTRAINT "author_sync_states_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Everything not archived was on the watchlist.
UPDATE "companies" SET "watched_at" = "created_at" WHERE "archived_at" IS NULL;
