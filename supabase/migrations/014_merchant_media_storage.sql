-- Merchant media storage bucket and RLS policies for web uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-media',
  'merchant-media',
  TRUE,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "merchant_media_public_read" ON storage.objects;
CREATE POLICY "merchant_media_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-media');

DROP POLICY IF EXISTS "merchant_media_auth_upload" ON storage.objects;
CREATE POLICY "merchant_media_auth_upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'merchant-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "merchant_media_auth_update" ON storage.objects;
CREATE POLICY "merchant_media_auth_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'merchant-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "merchant_media_auth_delete" ON storage.objects;
CREATE POLICY "merchant_media_auth_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'merchant-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
