import { supabase } from "@/integrations/supabase/client";

// Tipos de arquivo permitidos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

// Tamanhos máximos (em bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PORTFOLIO_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Valida se o arquivo é uma imagem válida
 */
function validateImageFile(file: File, maxSize: number = MAX_IMAGE_SIZE): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não suportado. Use JPEG, PNG ou WEBP.' };
  }
  
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, error: `Arquivo muito grande. Tamanho máximo: ${maxMB}MB` };
  }
  
  return { valid: true };
}

/**
 * Valida se o arquivo é uma imagem ou vídeo válido para portfolio
 */
function validatePortfolioFile(file: File): { valid: boolean; error?: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  
  if (!isImage && !isVideo) {
    return { valid: false, error: 'Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou MP4.' };
  }
  
  if (file.size > MAX_PORTFOLIO_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. Tamanho máximo: 10MB' };
  }
  
  return { valid: true };
}

/**
 * Deleta um arquivo do storage
 */
async function deleteStorageFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting file from ${bucket}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Faz upload do logo de um negócio
 * @returns URL pública da imagem ou null em caso de erro
 */
export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<{ url: string | null; error?: string }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: null, error: validation.error };
  }
  
  try {
    const { data: existingFiles } = await supabase.storage
      .from('business-logos')
      .list(businessId);
    
    if (existingFiles && existingFiles.length > 0) {
      await deleteStorageFile('business-logos', `${businessId}/${existingFiles[0].name}`);
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${fileExt}`;
    const filePath = `${businessId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('business-logos')
      .getPublicUrl(filePath);
    
    return { url: publicUrl };
  } catch (error: any) {
    console.error('Error uploading business logo:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Faz upload da capa de um negócio
 * @returns URL pública da imagem ou null em caso de erro
 */
export async function uploadBusinessCover(
  businessId: string,
  file: File
): Promise<{ url: string | null; error?: string }> {
  const validation = validateImageFile(file, MAX_PORTFOLIO_SIZE);
  if (!validation.valid) {
    return { url: null, error: validation.error };
  }
  
  try {
    const { data: existingFiles } = await supabase.storage
      .from('business-covers')
      .list(businessId);
    
    if (existingFiles && existingFiles.length > 0) {
      await deleteStorageFile('business-covers', `${businessId}/${existingFiles[0].name}`);
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `cover_${Date.now()}.${fileExt}`;
    const filePath = `${businessId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('business-covers')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('business-covers')
      .getPublicUrl(filePath);
    
    return { url: publicUrl };
  } catch (error: any) {
    console.error('Error uploading business cover:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Faz upload da imagem de um serviço
 * @returns URL pública da imagem ou null em caso de erro
 */
export async function uploadServiceImage(
  businessId: string,
  file: File
): Promise<{ url: string | null; error?: string }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: null, error: validation.error };
  }
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `service_${Date.now()}.${fileExt}`;
    const filePath = `${businessId}/services/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);
    
    return { url: publicUrl };
  } catch (error: any) {
    console.error('Error uploading service image:', error);
    return { url: null, error: error.message };
  }
}

/**
 * Faz upload de mídia para o portfolio
 * @returns URL pública da mídia ou null em caso de erro
 */
export async function uploadPortfolioMedia(
  businessId: string,
  file: File
): Promise<{ url: string | null; mediaType: 'image' | 'video'; error?: string }> {
  const validation = validatePortfolioFile(file);
  if (!validation.valid) {
    return { url: null, mediaType: 'image', error: validation.error };
  }
  
  const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `portfolio_${Date.now()}.${fileExt}`;
    const filePath = `${businessId}/portfolio/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('portfolio-media')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('portfolio-media')
      .getPublicUrl(filePath);
    
    return { url: publicUrl, mediaType };
  } catch (error: any) {
    console.error('Error uploading portfolio media:', error);
    return { url: null, mediaType, error: error.message };
  }
}

/**
 * Deleta a imagem de um serviço usando sua URL
 */
export async function deleteServiceImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!imageUrl) {
    return { success: true };
  }

  try {
    const urlParts = imageUrl.split('/service-images/');
    if (urlParts.length < 2) {
      return { success: false, error: 'URL inválida' };
    }
    
    const filePath = urlParts[1];
    return await deleteStorageFile('service-images', filePath);
  } catch (error: any) {
    console.error('Error deleting service image:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deleta a mídia do portfolio usando sua URL
 */
export async function deletePortfolioMedia(portfolioId: string, mediaUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const urlParts = mediaUrl.split('/portfolio-media/');
    if (urlParts.length !== 2) {
      return { success: false, error: 'URL inválida' };
    }
    
    const filePath = urlParts[1];
    return await deleteStorageFile('portfolio-media', filePath);
  } catch (error: any) {
    console.error('Error deleting portfolio media:', error);
    return { success: false, error: error.message };
  }
}
