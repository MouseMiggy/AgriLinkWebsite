import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../lib/firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import styles from '../../styles/modules/ReportModal.module.css'

const ReportModal = ({ visible, onClose, targetUser, content, contentType = 'post', reporterId }) => {
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Debug: Log content when modal becomes visible
  if (visible && content) {
    console.log('📋 ReportModal received content:', {
      contentType,
      imageUrl: content?.imageUrl,
      imageUrls: content?.imageUrls,
      mediaUrl: content?.mediaUrl,
      name: content?.name,
      caption: content?.caption,
      details: content?.details
    })
  }

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [visible])

  const handleReport = async () => {
    // Validate reporterId before proceeding
    if (!reporterId) {
      alert('You must be logged in to submit a report.')
      return
    }

    setLoading(true)

    try {
      const timestamp = Date.now()

      // Helper function to check if a string is base64 (to avoid storing large base64 images)
      // Only check for data: prefix, not length - Cloudinary URLs can be long but are valid
      const isBase64 = (str) => {
        if (!str || typeof str !== 'string') return false
        return str.startsWith('data:image') || str.startsWith('data:application')
      }

      // Helper function to filter out base64 images from URLs
      const filterValidUrls = (urls) => {
        if (!urls || !Array.isArray(urls)) return []
        return urls.map(url => {
          // Handle both string URLs and object URLs (e.g., { url: '...' })
          if (typeof url === 'string') return url
          if (typeof url === 'object' && url?.url) return url.url
          return null
        }).filter(url => url && typeof url === 'string' && !isBase64(url))
      }

      // Get clean URLs (filter out base64 images to avoid exceeding Firebase document size limit)
      const cleanImageUrl = isBase64(content?.imageUrl) ? '' : (content?.imageUrl || '')
      const cleanMediaUrl = isBase64(content?.mediaUrl) ? '' : (content?.mediaUrl || '')
      const cleanImageUrls = filterValidUrls(content?.imageUrls)
      
      // For listings, ensure single image URLs are added to imageUrls array
      // Add cleanImageUrl if it exists and is not already in the array
      if (contentType === 'listing' && cleanImageUrl && !cleanImageUrls.includes(cleanImageUrl)) {
        console.log('✅ Adding cleanImageUrl to imageUrls array:', cleanImageUrl)
        cleanImageUrls.push(cleanImageUrl)
      }
      // Add cleanMediaUrl if it exists, is different from cleanImageUrl, and not already in array
      if (contentType === 'listing' && cleanMediaUrl && cleanMediaUrl !== cleanImageUrl && !cleanImageUrls.includes(cleanMediaUrl)) {
        console.log('✅ Adding cleanMediaUrl to imageUrls array:', cleanMediaUrl)
        cleanImageUrls.push(cleanMediaUrl)
      }
      
      // Debug: Log image extraction
      console.log('🖼️ Image extraction DEBUG:', {
        contentType,
        rawImageUrl: content?.imageUrl,
        rawMediaUrl: content?.mediaUrl,
        rawImageUrls: content?.imageUrls,
        cleanImageUrl,
        cleanMediaUrl,
        cleanImageUrls,
        cleanImageUrlsLength: cleanImageUrls.length,
        isBase64ImageUrl: isBase64(content?.imageUrl),
        isBase64MediaUrl: isBase64(content?.mediaUrl)
      })
      
      // Determine if there's valid media
      const hasValidMedia = cleanImageUrl || cleanMediaUrl || cleanImageUrls.length > 0

      // Prepare report data matching mobile app structure exactly
      const reportData = {
        reporterId,
        reportedUserId: targetUser?.id || targetUser,
        reportedUserName: targetUser?.displayName || (targetUser?.firstName && targetUser?.lastName ? `${targetUser.firstName} ${targetUser.lastName}` : 'Unknown User'),
        reportType: contentType, // Use contentType as reportType (post, comment, listing, message)
        contentType,
        contentId: content?.id || '',
        postContent: content?.caption || content?.text || content?.content || '', // For display in reports
        caption: content?.caption || content?.text || content?.content || '', // For AI validation
        additionalNote: '',
        createdAt: new Date(),
        timestamp,
        mediaType: hasValidMedia ? 'image' : 'text',
        mediaUrl: cleanMediaUrl || cleanImageUrl,
        imageUrls: cleanImageUrls,
        postImageUrl: cleanImageUrl || cleanMediaUrl, // For display in modal
        // Flag if original had base64 image (for reference)
        hadBase64Image: isBase64(content?.imageUrl) || isBase64(content?.mediaUrl)
      }

      // Save report to Firestore
      const reportRef = await addDoc(collection(db, 'reports'), reportData)
      console.log('📝 Report saved to Firebase:', reportRef.id)

      // Call AI validation backend
      const backendUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || 'https://ai-backend-5-c10k.onrender.com'

      // Wait 2 seconds before showing success
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call AI validation backend asynchronously (don't wait for it)
      console.log('🔄 Calling AI validation backend:', backendUrl)
      
      // All reports use the same /validate-report endpoint (including listings)
      const endpoint = '/validate-report'
      
      // Prepare caption based on content type
      let caption = ''
      if (contentType === 'listing') {
        // For listings, combine name and details into caption
        const listingName = content?.caption || content?.name || content?.title || ''
        const listingDetails = content?.text || content?.details || content?.description || content?.content || ''
        caption = listingName + (listingDetails ? ` - ${listingDetails}` : '')
      } else {
        // For posts, comments, messages - use existing caption/text
        caption = content?.caption || content?.text || content?.content || ''
      }
      
      // Unified request body for all report types
      const requestBody = {
        reporterId,
        reportedUserId: targetUser?.id || targetUser,
        contentType,
        contentId: content?.id || '',
        caption: caption,
        mediaType: hasValidMedia ? 'image' : 'text',
        mediaUrl: cleanMediaUrl || cleanImageUrl,
        imageUrls: cleanImageUrls,
        reportType: contentType === 'listing' ? 'spam' : 'offensive',
        additionalNote: '',
        timestamp
      }
      
      console.log('📤 Sending report data:', {
        contentType,
        caption: requestBody.caption?.substring(0, 100),
        mediaUrl: requestBody.mediaUrl ? 'present' : 'none',
        imageUrls: requestBody.imageUrls,
        imageUrlsCount: requestBody.imageUrls?.length || 0
      })

      fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      .then(response => {
        console.log('✅ AI response status:', response.status)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(result => {
        console.log('🤖 AI validation result:', result)
        // Update report with AI validation results - use both field names for compatibility
        if (result && result.result) {
          return updateDoc(doc(db, 'reports', reportRef.id), {
            aiValidation: result.result,        // Mobile app uses this
            aiValidationResult: result.result,   // Web uses this
            status: 'reviewed',
            reviewedAt: new Date()
          })
        } else {
          console.error('❌ Invalid AI response format:', result)
        }
      })
      .catch(aiError => {
        console.error('❌ AI validation error:', aiError)
        console.error('Error details:', aiError.message)
        // Report still saved, just without AI validation
      })

      // Show success after loading
      setLoading(false)
      setShowSuccess(true)

    } catch (error) {
      console.error('❌ Report submission error:', error)
      alert('Failed to submit report. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowSuccess(false)
    setLoading(false)
    onClose()
  }

  if (!visible) return null

  // Use createPortal to render at document body level to ensure proper z-index stacking
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Confirmation Modal */}
      {!showSuccess && !loading && (
        <div className={styles.modalOverlay} onClick={handleClose}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Confirm Report</h3>
            <p className={styles.confirmText}>
              Are you sure you want to report this {contentType}?
            </p>
            <div className={styles.confirmButtons}>
              <button onClick={handleClose} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleReport} className={styles.confirmButton}>
                Yes, Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loading && (
        <div className={styles.modalOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Submitting report...</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successTitle}>Report Submitted</p>
            <p className={styles.successMessage}>
              Our AI will validate your report. See report status at Reports.
            </p>
            <button onClick={handleClose} className={styles.okButton}>
              Okay
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}

export default ReportModal
