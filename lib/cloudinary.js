// Cloudinary configuration for web application
export const uploadImageToCloudinary = async (imageFile) => {
  try {
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', 'ml_default'); // Same preset as mobile app
    formData.append('cloud_name', 'dzwnts0ii'); // Same cloud name as mobile app

    console.log('Uploading image to Cloudinary...');

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzwnts0ii/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (response.ok && data.secure_url) {
      console.log('Image uploaded successfully:', data.secure_url);
      return data.secure_url;
    } else {
      console.error('Cloudinary upload failed:', data);
      throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Function to extract public ID from Cloudinary URL
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;
    
    // Get the part after version (if exists) or after upload
    let publicIdPart = parts[uploadIndex + 2] || parts[uploadIndex + 1];
    
    // Remove file extension
    const publicId = publicIdPart.split('.')[0];
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};
