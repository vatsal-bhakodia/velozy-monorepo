ALTER TABLE "ai_chats"
  ADD COLUMN IF NOT EXISTS "surface" varchar(30) NOT NULL DEFAULT 'admin';

CREATE INDEX IF NOT EXISTS "ai_chats_project_updated_idx"
  ON "ai_chats" USING btree ("project_id", "updated_at");
