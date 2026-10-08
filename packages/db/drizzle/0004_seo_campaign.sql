CREATE TABLE IF NOT EXISTS "seo_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "status" varchar(24) DEFAULT 'setup' NOT NULL,
  "profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "profile_confirmed_at" timestamp,
  "profile_confirmed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "autopilot_enabled" boolean DEFAULT false NOT NULL,
  "autopilot_authorized_at" timestamp,
  "autopilot_authorized_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "seo_campaigns_project_idx" ON "seo_campaigns" USING btree ("project_id");

CREATE TABLE IF NOT EXISTS "seo_campaign_competitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "domain" varchar(253) NOT NULL,
  "classification" varchar(32) DEFAULT 'search_competitor' NOT NULL,
  "status" varchar(20) DEFAULT 'candidate' NOT NULL,
  "evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "verified_at" timestamp,
  "verified_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "seo_campaign_competitors_identity_idx" ON "seo_campaign_competitors" USING btree ("campaign_id", "domain");
CREATE INDEX IF NOT EXISTS "seo_campaign_competitors_status_idx" ON "seo_campaign_competitors" USING btree ("campaign_id", "status");

CREATE TABLE IF NOT EXISTS "seo_campaign_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "kind" varchar(32) NOT NULL,
  "status" varchar(24) DEFAULT 'queued' NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "input" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result" jsonb,
  "last_error" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "queue_job_id" varchar(100),
  "idempotency_key" varchar(100),
  "lease_token" uuid,
  "lock_expires_at" timestamp,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "seo_campaign_jobs_status_idx" ON "seo_campaign_jobs" USING btree ("campaign_id", "status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_campaign_jobs_queue_id_idx" ON "seo_campaign_jobs" USING btree ("queue_job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_campaign_jobs_idempotency_idx" ON "seo_campaign_jobs" USING btree ("campaign_id", "idempotency_key");

CREATE TABLE IF NOT EXISTS "seo_campaign_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "cluster" varchar(255) NOT NULL,
  "intent" varchar(40) NOT NULL,
  "target_type" varchar(24) NOT NULL,
  "target_id" uuid,
  "target_path" varchar(500),
  "action" varchar(32) NOT NULL,
  "status" varchar(24) DEFAULT 'proposed' NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "rationale" text NOT NULL,
  "confidence" varchar(16) DEFAULT 'medium' NOT NULL,
  "draft" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "seo_campaign_opportunities_status_idx" ON "seo_campaign_opportunities" USING btree ("campaign_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "seo_campaign_publications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "opportunity_id" uuid REFERENCES "seo_campaign_opportunities"("id") ON DELETE SET NULL,
  "target_type" varchar(24) NOT NULL,
  "target_id" uuid NOT NULL,
  "before_value" jsonb,
  "after_value" jsonb NOT NULL,
  "published_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamp DEFAULT now() NOT NULL,
  "rollback_of" uuid
);
CREATE INDEX IF NOT EXISTS "seo_campaign_publications_created_idx" ON "seo_campaign_publications" USING btree ("campaign_id", "published_at");

CREATE TABLE IF NOT EXISTS "seo_campaign_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "media_id" uuid NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
  "source" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "seo_campaign_assets_media_idx" ON "seo_campaign_assets" USING btree ("media_id");
CREATE INDEX IF NOT EXISTS "seo_campaign_assets_campaign_idx" ON "seo_campaign_assets" USING btree ("campaign_id", "created_at");
