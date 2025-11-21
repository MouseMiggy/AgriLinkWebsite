import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import styles from '../../styles/modules/ReportModal.module.css'

const ReportModal = ({ visible, onClose, targetUser, content, contentType = 'post', reporterId }) => {
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)

    try {
      const timestamp = Date.now()

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
        mediaType: (content?.imageUrl || content?.imageUrls?.length > 0) ? 'image' : 'text',
        mediaUrl: content?.imageUrl || content?.mediaUrl || '',
        imageUrls: content?.imageUrls || [],
        postImageUrl: content?.imageUrl || content?.mediaUrl || '' // For display in modal
      }

      // Save report to Firestore
      const reportRef = await addDoc(collection(db, 'reports'), reportData)
      console.log('📝 Report saved to Firebase:', reportRef.id)

      // Call AI validation backend
      const backendUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || 'http://192.168.1.20:5000'

      // Wait 2 seconds before showing success
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call AI validation backend asynchronously (don't wait for it)
      console.log('🔄 Calling AI validation backend:', backendUrl)
      console.log('📤 Sending data:', {
        caption: content?.caption || content?.text || content?.content || '',
        mediaUrl: content?.imageUrl || content?.mediaUrl || '',
        imageUrls: content?.imageUrls || []
      })

      fetch(`${backendUrl}/validate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reporterId,
          reportedUserId: targetUser?.id || targetUser,
          contentType,
          contentId: content?.id || '',
          caption: content?.caption || content?.text || content?.content || '',
          mediaType: (content?.imageUrl || content?.imageUrls?.length > 0) ? 'image' : 'text',
          mediaUrl: content?.imageUrl || content?.mediaUrl || '',
          imageUrls: content?.imageUrls || [],
          reportType: 'offensive',
          additionalNote: '',
          timestamp
        })
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

  return (
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
    </>
  )
}

export default ReportModal
