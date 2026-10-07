INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('site-media', 'site-media', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;
