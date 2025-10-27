-- Fase 2: Simplificar políticas RLS do storage
DROP POLICY IF EXISTS "Business owners can update service images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete service images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update portfolio media" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete portfolio media" ON storage.objects;

CREATE POLICY "Business owners can update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('business-logos', 'business-covers', 'service-images', 'portfolio-media')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('business-logos', 'business-covers', 'service-images', 'portfolio-media')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Fase 4: Permitir NULL em media_data e limpar base64
ALTER TABLE business_portfolio ALTER COLUMN media_data DROP NOT NULL;

UPDATE services 
SET image_url = NULL 
WHERE image_url LIKE 'data:image/%';

UPDATE business_portfolio 
SET media_data = NULL 
WHERE media_data LIKE 'data:image/%' OR media_data LIKE 'data:video/%';