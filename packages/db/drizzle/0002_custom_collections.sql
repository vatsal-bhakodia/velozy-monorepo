CREATE TABLE IF NOT EXISTS "custom_collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "key" varchar(80) NOT NULL,
  "description" text,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_archived" boolean DEFAULT false NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "custom_collections_project_key_idx" ON "custom_collections" USING btree ("project_id", "key");
CREATE INDEX IF NOT EXISTS "custom_collections_project_list_idx" ON "custom_collections" USING btree ("project_id", "is_archived", "name");

CREATE TABLE IF NOT EXISTS "custom_collection_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "collection_id" uuid NOT NULL REFERENCES "custom_collections"("id") ON DELETE CASCADE,
  "values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "custom_collection_records_order_idx" ON "custom_collection_records" USING btree ("collection_id", "status", "sort_order", "created_at");
