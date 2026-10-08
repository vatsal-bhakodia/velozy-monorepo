CREATE TABLE "seo_campaign_research_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "seo_campaigns"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "status" varchar(24) DEFAULT 'queued' NOT NULL,
  "profile_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "locale" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result" jsonb,
  "last_error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "seo_campaign_research_runs_version_idx" ON "seo_campaign_research_runs" USING btree ("campaign_id", "version");
CREATE INDEX "seo_campaign_research_runs_status_idx" ON "seo_campaign_research_runs" USING btree ("campaign_id", "status", "created_at");

CREATE TABLE "seo_campaign_research_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL REFERENCES "seo_campaign_research_runs"("id") ON DELETE CASCADE,
  "kind" varchar(32) NOT NULL,
  "source" varchar(64) NOT NULL,
  "subject" varchar(500) NOT NULL,
  "locale" varchar(32),
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "retrieved_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "seo_campaign_research_evidence_run_kind_idx" ON "seo_campaign_research_evidence" USING btree ("run_id", "kind");
CREATE INDEX "seo_campaign_research_evidence_subject_idx" ON "seo_campaign_research_evidence" USING btree ("subject", "retrieved_at");
CREATE UNIQUE INDEX "seo_campaign_research_evidence_identity_idx" ON "seo_campaign_research_evidence" USING btree ("run_id", "kind", "source", "subject");

ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "research_run_id" uuid REFERENCES "seo_campaign_research_runs"("id") ON DELETE SET NULL;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "candidate_key" varchar(255);
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "score" integer;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "score_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "evidence_coverage" integer;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "autopilot_eligible" boolean DEFAULT false NOT NULL;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "approved_at" timestamp;
ALTER TABLE "seo_campaign_opportunities" ADD COLUMN "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX "seo_campaign_opportunities_run_idx" ON "seo_campaign_opportunities" USING btree ("research_run_id", "score");
CREATE UNIQUE INDEX "seo_campaign_opportunities_run_candidate_idx" ON "seo_campaign_opportunities" USING btree ("research_run_id", "candidate_key");
