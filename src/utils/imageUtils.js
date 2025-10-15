// Utility Functions - Image Processing and Handling
export const getPostImages = (post) => {
  if (!post) return []
  
  // Priority order: use the most comprehensive image source available
  // 1. Check for multiple images array first (most common for multiple images)
  if (post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0) {
    return post.imageUrls.filter(Boolean)
  }
  
  // 2. Check for images array
  if (post.images && Array.isArray(post.images) && post.images.length > 0) {
    return post.images.filter(Boolean)
  }
  
  // 3. Check for single image (only if no arrays exist)
  if (post.imageUrl || post.image) {
    return [post.imageUrl || post.image].filter(Boolean)
  }
  
  return []
}

export const resizeImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a valid image file.')
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Please upload an image smaller than 10MB.')
  }
  
  return true
}
