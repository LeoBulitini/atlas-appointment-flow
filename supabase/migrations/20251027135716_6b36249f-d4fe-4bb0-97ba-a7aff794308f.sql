-- Criar buckets de storage para imagens do negócio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('business-logos', 'business-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('business-covers', 'business-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('service-images', 'service-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('portfolio-media', 'portfolio-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies para business-logos
CREATE POLICY "Qualquer um pode ver logos de negócios"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

CREATE POLICY "Donos de negócios podem fazer upload de logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem atualizar seu logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-logos' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem deletar seu logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-logos' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS policies para business-covers
CREATE POLICY "Qualquer um pode ver covers de negócios"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-covers');

CREATE POLICY "Donos de negócios podem fazer upload de cover"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-covers' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem atualizar seu cover"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-covers' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem deletar seu cover"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-covers' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS policies para service-images
CREATE POLICY "Qualquer um pode ver imagens de serviços"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Donos de negócios podem fazer upload de imagem de serviço"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM services
    JOIN businesses ON businesses.id = services.business_id
    WHERE services.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem atualizar imagem de serviço"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM services
    JOIN businesses ON businesses.id = services.business_id
    WHERE services.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem deletar imagem de serviço"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM services
    JOIN businesses ON businesses.id = services.business_id
    WHERE services.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS policies para portfolio-media
CREATE POLICY "Qualquer um pode ver portfolio de negócios"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-media');

CREATE POLICY "Donos de negócios podem fazer upload de portfolio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-media' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem atualizar portfolio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio-media' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Donos de negócios podem deletar portfolio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio-media' AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id::text = (storage.foldername(storage.objects.name))[1]
    AND businesses.owner_id = auth.uid()
  )
);

-- Remover constraint de tamanho do logo_url (não precisamos mais, usaremos URLs)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS check_logo_url_length;