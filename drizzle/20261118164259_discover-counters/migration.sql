CREATE TABLE "discover_daily_counters" (
	"subject_type" text,
	"subject_id" uuid,
	"day" date,
	"views" integer DEFAULT 0 NOT NULL,
	"copies" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "discover_daily_counters_pkey" PRIMARY KEY("subject_type","subject_id","day"),
	CONSTRAINT "discover_daily_counters_views_nonneg" CHECK ("views" >= 0),
	CONSTRAINT "discover_daily_counters_copies_nonneg" CHECK ("copies" >= 0)
);
