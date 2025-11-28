import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { getAuth } from 'firebase/auth';

/**
 * Upload image to Firebase Storage
 * @param {File} imageFile - File object from file input
 * @param {string} folder - Storage folder (e.g., 'Images/Feed', 'Images/Profile', 'Images/Listings')
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadImageToFirebaseStorage = async (imageFile, folder = 'Images', userId = 'anonymous') => {
  try {
    console.log('Starting Firebase Storage upload...');
    console.log('File name:', imageFile.name);
    console.log('File size:', imageFile.size);
    console.log('File type:', imageFile.type);
    console.log('Folder:', folder);
    console.log('User ID:', userId);

    // Check authentication status
    const auth = getAuth();
    const currentUser = auth.currentUser;
    console.log('🔐 Current user authenticated:', !!currentUser);
    console.log('🔐 User UID:', currentUser?.uid);
    console.log('🔐 User email:', currentUser?.email);
    
    if (!currentUser) {
      throw new Error('User not authenticated. Please sign in again.');
    }

    // Validate inputs
    if (!imageFile) {
      throw new Error('Image file is required');
    }

    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      throw new Error('File size too large. Please upload images smaller than 10MB.');
    }

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split('.').pop().toLowerCase();
    const filename = `${userId}_${timestamp}.${fileExtension}`;
    const storagePath = `${folder}/${filename}`;
    
    console.log('📍 Storage path:', storagePath);

    // Create storage reference
    const storageRef = ref(storage, storagePath);
    console.log('✅ Storage reference created');
    console.log('🪣 Bucket:', storageRef.bucket);
    console.log('📄 Full path:', storageRef.fullPath);

    // Prepare metadata
    const metadata = {
      contentType: imageFile.type,
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        folder: folder,
        originalName: imageFile.name,
        originalSize: imageFile.size.toString(),
        source: 'web'
      }
    };
    
    console.log('📋 Upload metadata:', JSON.stringify(metadata, null, 2));

    // Upload to Firebase Storage with retry logic
    console.log('Uploading to Firebase Storage...');
    let snapshot;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        snapshot = await uploadBytes(storageRef, imageFile, metadata);
        console.log('Upload successful, snapshot metadata:', snapshot.metadata);
        break; // Success, exit retry loop
      } catch (uploadError) {
        retryCount++;
        console.log(`Upload attempt ${retryCount} failed:`, uploadError.code);
        
        if (uploadError.code === 'storage/unknown' && retryCount < maxRetries) {
          console.log(`Retrying upload in 2 seconds... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          continue;
        } else {
          throw uploadError; // Re-throw if not retryable or max retries reached
        }
      }
    }

    // Get download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('Detailed Firebase Storage error:', {
      message: error.message,
      code: error.code,
      serverResponse: error.serverResponse,
      customData: error.customData
    });
    
    // Provide more specific error messages
    let userFriendlyMessage = 'Failed to upload image';
    
    if (error.code === 'storage/unauthorized') {
      userFriendlyMessage = 'Permission denied. Please check Firebase Storage rules.';
    } else if (error.code === 'storage/canceled') {
      userFriendlyMessage = 'Upload was canceled.';
    } else if (error.code === 'storage/unknown') {
      userFriendlyMessage = 'Upload failed due to server error. Please check Firebase Storage rules and try again.';
    } else if (error.code === 'storage/invalid-format') {
      userFriendlyMessage = 'Invalid image format.';
    } else if (error.code === 'storage/invalid-argument') {
      userFriendlyMessage = 'Invalid upload parameters.';
    } else if (error.message.includes('Invalid file type')) {
      userFriendlyMessage = error.message;
    } else if (error.message.includes('File size too large')) {
      userFriendlyMessage = error.message;
    }
    
    throw new Error(userFriendlyMessage);
  }
};

/**
 * Upload multiple images to Firebase Storage
 * @param {Array<File>} imageFiles - Array of File objects
 * @param {string} folder - Storage folder
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<Array<string>>} - Array of download URLs
 */
export const uploadMultipleImagesToFirebaseStorage = async (imageFiles, folder = 'images', userId = 'anonymous') => {
  try {
    console.log('Uploading multiple images to Firebase Storage...');
    
    const uploadPromises = imageFiles.map((file, index) => 
      uploadImageToFirebaseStorage(file, folder, `${userId}_${index}`)
    );
    
    const downloadURLs = await Promise.all(uploadPromises);
    console.log('All images uploaded successfully:', downloadURLs);
    
    return downloadURLs;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Get optimized image URL (Firebase Storage doesn't have built-in optimization like Cloudinary)
 * For now, this returns the original URL, but you could integrate with a service like ImageKit
 * @param {string} downloadURL - Firebase Storage download URL
 * @param {Object} options - Optimization options (for future use)
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (downloadURL, options = {}) => {
  // Firebase Storage doesn't have built-in image optimization
  // You could integrate with services like ImageKit, Cloudflare Images, etc.
  // For now, return the original URL
  return downloadURL;
};

/**
 * Extract filename from Firebase Storage URL
 * @param {string} url - Firebase Storage download URL
 * @returns {string|null} - Extracted filename or null
 */
export const getFilenameFromFirebaseUrl = (url) => {
  if (!url || !url.includes('firebase')) return null;
  
  try {
    // Firebase Storage URLs have format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Ffilename?alt=media&token=...
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract the encoded path after '/o/'
    const match = pathname.match(/\/o\/(.+)$/);
    if (match) {
      // Decode the path and extract filename
      const decodedPath = decodeURIComponent(match[1]);
      const filename = decodedPath.split('/').pop();
      return filename;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting filename from Firebase URL:', error);
    return null;
  }
};

/**
 * Delete image from Firebase Storage
 * @param {string} downloadURL - Firebase Storage download URL
 * @returns {Promise<void>}
 */
export const deleteImageFromFirebaseStorage = async (downloadURL) => {
  try {
    if (!downloadURL || !downloadURL.includes('firebase')) {
      console.warn('Invalid Firebase Storage URL provided for deletion');
      return;
    }

    // Create reference from URL
    const storageRef = ref(storage, downloadURL);
    
    // Delete the file
    await deleteObject(storageRef);
    console.log('Image deleted successfully from Firebase Storage');
  } catch (error) {
    console.error('Error deleting image from Firebase Storage:', error);
    throw error;
  }
};

/**
 * Check if URL is from Firebase Storage
 * @param {string} url - URL to check
 * @returns {boolean} - True if Firebase Storage URL
 */
export const isFirebaseStorageUrl = (url) => {
  return url && url.includes('firebasestorage.googleapis.com');
};

/**
 * Check if URL is from Cloudinary (for backward compatibility)
 * @param {string} url - URL to check
 * @returns {boolean} - True if Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
  return url && url.includes('cloudinary.com');
};

// Export default upload function for backward compatibility
export default uploadImageToFirebaseStorage;
