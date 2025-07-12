import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export interface PhotoUpload {
  file: {
    name: string;
    type: string;
    size?: number;
  };
  preview: string;
  id: string;
}

export interface SavedPhoto {
  url: string;
  filename: string;
}

// Initialize storage and check for bucket existence
export const initializeStorage = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking storage buckets:', error);
      return;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'journal-photos');
    
    if (!bucketExists) {
      console.warn('Storage bucket "journal-photos" not found. Please create it manually in your Supabase dashboard.');
    } else {
      console.log('Storage bucket "journal-photos" found and ready');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};

// Helper function to generate a unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Upload photos to Supabase Storage with userId in path
export const uploadPhotos = async (userId: string, photos: PhotoUpload[], entryDate: string): Promise<SavedPhoto[]> => {
  try {
    const savedPhotos: SavedPhoto[] = [];
    
    console.log(`[UPLOAD] Starting upload of ${photos.length} photos for user ${userId} on date ${entryDate}`);
    console.log(`[UPLOAD] Supabase URL exists: ${!!supabase.supabaseUrl}`);
    console.log(`[UPLOAD] Supabase key length: ${supabase.supabaseKey?.length || 0}`);
    
    for (const photo of photos) {
      try {
        // Create filename with timestamp
        const timestamp = Date.now();
        // Sanitize extension - trim whitespace and ensure lowercase
        const rawExtension = photo.file.name.split('.').pop() || 'jpg';
        const extension = rawExtension.trim().toLowerCase();
        
        console.log(`[UPLOAD] Original extension: "${rawExtension}", Sanitized: "${extension}"`);
        
        const filename = `${timestamp}-${photo.id}.${extension}`;
        
        // Include userId in the file path for RLS compliance
        const filePath = `${userId}/${entryDate}/${filename}`;
        
        console.log(`[UPLOAD] Processing photo: ${photo.id}`);
        console.log(`[UPLOAD] File details:`, {
          name: photo.file.name,
          type: photo.file.type,
          size: photo.file.size || 'unknown',
          previewLength: photo.preview?.length || 0
        });
        console.log(`[UPLOAD] Target path: ${filePath}`);
        
        // For mobile, we need to handle the file differently
        const fileUri = photo.preview;
        
        try {
          console.log(`[UPLOAD] Reading file as base64: ${fileUri.substring(0, 50)}...`);
          
          // Read the file as base64 - this works for both file:// URIs and asset URIs
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          console.log(`[UPLOAD] Base64 data length: ${base64Data.length}`);
          console.log(`[UPLOAD] Base64 data preview: ${base64Data.substring(0, 50)}...`);
          
          // Determine content type based on extension
          let contentType = photo.file.type;
          if (!contentType || contentType === 'application/octet-stream') {
            // Fallback content type based on extension
            if (extension === 'jpg' || extension === 'jpeg') {
              contentType = 'image/jpeg';
            } else if (extension === 'png') {
              contentType = 'image/png';
            } else if (extension === 'gif') {
              contentType = 'image/gif';
            } else if (extension === 'webp') {
              contentType = 'image/webp';
            } else {
              contentType = 'image/jpeg'; // Default fallback
            }
            console.log(`[UPLOAD] Using fallback content type: ${contentType}`);
          }
          
          // Upload file to Supabase Storage
          console.log(`[UPLOAD] Uploading to Supabase Storage with content type: ${contentType}`);
          const { data, error } = await supabase.storage
            .from('journal-photos')
            .upload(filePath, base64Data, {
              contentType: contentType,
              cacheControl: '3600',
              upsert: true
            });
          
          if (error) {
            console.error('[UPLOAD] Error uploading photo:', error);
            console.error('[UPLOAD] Error details:', {
              message: error.message,
              name: error.name,
              code: error.code,
              details: error.details,
              hint: error.hint,
              status: error.status
            });
            
            // Try again with explicit decode and different content type
            console.log('[UPLOAD] Retrying with explicit content type...');
            const { data: retryData, error: retryError } = await supabase.storage
              .from('journal-photos')
              .upload(filePath, base64Data, {
                contentType: 'image/jpeg',
                upsert: true
              });
              
            if (retryError) {
              console.error('[UPLOAD] Retry error:', retryError);
              console.error('[UPLOAD] Retry error details:', {
                message: retryError.message,
                name: retryError.name,
                code: retryError.code,
                details: retryError.details,
                hint: retryError.hint,
                status: retryError.status
              });
              throw retryError;
            } else {
              console.log('[UPLOAD] Retry successful:', retryData);
              data = retryData;
            }
          }
          
          console.log('[UPLOAD] Photo uploaded successfully:', data);
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('journal-photos')
            .getPublicUrl(filePath);
          
          // Verify the URL doesn't have any spaces or problematic characters
          const sanitizedUrl = publicUrl.trim();
          console.log('[UPLOAD] Original URL:', publicUrl);
          console.log('[UPLOAD] Sanitized URL:', sanitizedUrl);
          
          savedPhotos.push({
            url: sanitizedUrl,
            filename: filename
          });
          
          console.log('[UPLOAD] Photo URL generated:', sanitizedUrl);
        } catch (readError) {
          console.error('[UPLOAD] Error reading file:', readError);
          console.error('[UPLOAD] Error reading file details:', {
            name: readError.name,
            message: readError.message,
            stack: readError.stack,
            code: readError.code,
            // Log any additional properties that might be present
            ...readError
          });
          throw readError;
        }  
      } catch (error) {
        console.error('[UPLOAD] Error processing photo upload:', error);
        console.error('[UPLOAD] Error processing details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          // Log any additional properties that might be present
          ...error
        });
        throw error;
      }
    }
    
    console.log(`[UPLOAD] Successfully uploaded ${savedPhotos.length} photos`);
    return savedPhotos;
  } catch (error) {
    console.error('[UPLOAD] Error in uploadPhotos:', error);
    console.error('[UPLOAD] Error in uploadPhotos details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      // Log any additional properties that might be present
      ...error
    });
    throw error;
  }
}

// Delete photo from storage
export const deletePhoto = async (photoUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = photoUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'journal-photos');
    if (bucketIndex === -1) return false;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    
    console.log(`[DELETE] Deleting photo: ${filePath}`);
    
    const { error } = await supabase.storage
      .from('journal-photos')
      .remove([filePath]);
    
    if (error) {
      console.error('[DELETE] Error deleting photo from storage:', error);
      console.error('[DELETE] Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status
      });
      return false;
    }
    
    console.log('[DELETE] Photo deleted successfully');
    return true;
  } catch (error) {
    console.error('[DELETE] Error deleting photo:', error);
    console.error('[DELETE] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      // Log any additional properties that might be present
      ...error
    });
    return false;
  }
};

// Get photos for a specific date
export const getPhotosForDate = async (userId: string, date: string): Promise<string[]> => {
  try {
    console.log(`[GET] Fetching photos for user ${userId} on date ${date}`);
    
    const { data, error } = await supabase
      .from('journal_entries') 
      .select('photos')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .eq('entry_type', 'individual');
    
    if (error) {
      console.error('[GET] Error fetching photos for date:', error);
      console.error('[GET] Error details:', {
        message: error.message, 
        name: error.name,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status
      });
      return [];
    }
    
    // Flatten all photos from all entries for this date
    const allPhotos = data?.reduce((acc, entry) => {
      if (entry.photos && Array.isArray(entry.photos)) {
        // Sanitize each URL to ensure no spaces or problematic characters
        const sanitizedPhotos = entry.photos.map(url => url.trim());
        return [...acc, ...sanitizedPhotos];
      }
      return acc;
    }, [] as string[]) || [];
    
    console.log(`[GET] Found ${allPhotos.length} photos for date ${date}`);
    if (allPhotos.length > 0) {
      console.log(`[GET] First photo URL: ${allPhotos[0]}`);
    }
    
    return allPhotos;
  } catch (error) {
    console.error('[GET] Error getting photos for date:', error);
    console.error('[GET] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      // Log any additional properties that might be present
      ...error
    });
    return [];
  }
};