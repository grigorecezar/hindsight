CREATE TYPE "public"."horizon" AS ENUM('ONE_MONTH', 'TWO_MONTHS', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_MONTHS');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY');--> statement-breakpoint
CREATE TYPE "public"."run_kind" AS ENUM('BACKFILL', 'WEEKLY', 'MONTHLY', 'REFRESH');--> statement-breakpoint
CREATE TYPE "public"."run_trigger" AS ENUM('CRON', 'APP', 'CLI');--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"author_id" uuid,
	"rating" "rating" NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"title" text,
	"url" text,
	"entry_date" date,
	"entry_price" double precision,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "companies_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "consensus_snapshots" (
	"company_id" uuid NOT NULL,
	"as_of" date NOT NULL,
	"score" double precision NOT NULL,
	"rating" "rating" NOT NULL,
	"call_count" integer NOT NULL,
	"effective_call_count" double precision NOT NULL,
	"price" double precision,
	"expected" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consensus_snapshots_company_id_as_of_pk" PRIMARY KEY("company_id","as_of")
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"call_id" uuid NOT NULL,
	"horizon" "horizon" NOT NULL,
	"exit_date" date NOT NULL,
	"exit_price" double precision NOT NULL,
	"stock_return" double precision NOT NULL,
	"benchmark_return" double precision NOT NULL,
	"excess_return" double precision NOT NULL,
	"max_runup" double precision NOT NULL,
	"max_drawdown" double precision NOT NULL,
	"target_hit_on" date,
	"stop_hit_on" date,
	"is_hit" boolean NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outcomes_call_id_horizon_pk" PRIMARY KEY("call_id","horizon")
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"ticker" text NOT NULL,
	"date" date NOT NULL,
	"close" double precision NOT NULL,
	"adjusted_close" double precision NOT NULL,
	CONSTRAINT "prices_ticker_date_pk" PRIMARY KEY("ticker","date")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "run_kind" NOT NULL,
	"trigger" "run_trigger" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error" text,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "sync_states" (
	"source" text NOT NULL,
	"company_id" uuid NOT NULL,
	"backfilled_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"latest_published_at" timestamp with time zone,
	CONSTRAINT "sync_states_source_company_id_pk" PRIMARY KEY("source","company_id")
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consensus_snapshots" ADD CONSTRAINT "consensus_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_states" ADD CONSTRAINT "sync_states_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "authors_source_external_id_key" ON "authors" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_source_external_id_company_id_key" ON "calls" USING btree ("source","external_id","company_id");--> statement-breakpoint
CREATE INDEX "calls_company_id_published_at_idx" ON "calls" USING btree ("company_id","published_at");--> statement-breakpoint
CREATE INDEX "calls_author_id_idx" ON "calls" USING btree ("author_id");