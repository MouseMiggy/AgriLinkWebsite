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

  // Helper function to parse AI response into separate text and image analysis
  const parseAIResponse = (reason) => {
    if (!reason) {
      return { textAnalysis: 'No analysis available', imageAnalysis: 'No analysis available' }
    }

    console.log('🔍 Parsing AI response:', reason.substring(0, 200))

    // Try different parsing strategies
    let textAnalysis = ''
    let imageAnalysis = ''

    // Strategy 1: Look for "Listing Name/Details Analysis:" and extract only that content
    const textMatch = reason.match(/Listing Name\/Details Analysis:[\s\S]*?(?=Image \d+ Analysis:|Overall Assessment:|$)/i)
    const imageMatch = reason.match(/Image \d+ Analysis:[\s\S]*?(?=Overall Assessment:|$)/i)
    
    if (textMatch && imageMatch) {
      textAnalysis = textMatch[0].replace('Listing Name/Details Analysis:', '').replace('Text Analysis:', '').replace('Text content analysis:', '').trim()
      imageAnalysis = imageMatch[0].replace(/Image \d+ Analysis:/i, '').trim()
    } else {
      // Strategy 2: Look for "Text content analysis:" and exclude image content
      const textContentMatch = reason.match(/Text content analysis:[\s\S]*?(?=Image \d+ Analysis:|Overall Assessment:|$)/i)
      const imageContentMatch = reason.match(/Image \d+ Analysis:[\s\S]*?(?=Overall Assessment:|$)/i)
      
      if (textContentMatch && imageContentMatch) {
        textAnalysis = textContentMatch[0].replace('Text content analysis:', '').replace('Text Analysis:', '').trim()
        imageAnalysis = imageContentMatch[0].replace(/Image \d+ Analysis:/i, '').trim()
      } else {
        // Strategy 3: Look for "Text Analysis:" and "Image Analysis:" markers
        const textAnalysisMatch = reason.match(/Text Analysis:[\s\S]*?(?=Image Analysis:|Overall Assessment:|$)/i)
        const imageAnalysisMatch = reason.match(/Image Analysis:[\s\S]*?(?=Overall Assessment:|$)/i)
        
        if (textAnalysisMatch && imageAnalysisMatch) {
          textAnalysis = textAnalysisMatch[0].replace('Text Analysis:', '').trim()
          imageAnalysis = imageAnalysisMatch[0].replace('Image Analysis:', '').trim()
        } else {
          // Strategy 4: Fallback - split at first "Image" mention
          const imageIndex = reason.search(/Image \d+ Analysis:/i)
          if (imageIndex > 0) {
            textAnalysis = reason.substring(0, imageIndex).trim()
            imageAnalysis = reason.substring(imageIndex).replace(/Image \d+ Analysis:/i, '').trim()
          } else {
            // Final fallback: split the response
            const sentences = reason.split('. ')
            const midPoint = Math.ceil(sentences.length / 2)
            
            textAnalysis = sentences.slice(0, midPoint).join('. ').trim()
            imageAnalysis = sentences.slice(midPoint).join('. ').trim()
            
            // Add context since we're splitting
            if (textAnalysis && !textAnalysis.includes('text')) {
              textAnalysis = 'Text content analysis: ' + textAnalysis
            }
            if (imageAnalysis && !imageAnalysis.includes('image')) {
              imageAnalysis = 'Visual content analysis: ' + imageAnalysis
            }
          }
        }
      }
    }
    
    return {
      textAnalysis: textAnalysis || 'No text analysis available',
      imageAnalysis: imageAnalysis || 'No image analysis available'
    }
  }

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

      // Call AI validation backend - use different endpoint for listing reports
      let backendUrl, requestBody;
      
      if (contentType === 'listing') {
        // Use listing report validation endpoint for listing reports
        backendUrl = 'https://ai-backend-6-565d.onrender.com/validate-listing-report'
        
        // Prepare listing name and details for validation
        const listingName = content?.caption || content?.name || content?.title || ''
        const listingDetails = content?.text || content?.details || content?.description || content?.content || ''
        
        requestBody = {
          imageUrl: cleanMediaUrl || cleanImageUrl || (cleanImageUrls.length > 0 ? cleanImageUrls[0] : ''),
          listingName: listingName,
          listingDetails: listingDetails,
          reportType: 'spam',
          additionalNote: ''
        }
        
        console.log('🔗 Full listing report validation URL:', backendUrl)
      } else if (contentType === 'message' || contentType === 'chat' || contentType === 'comment') {
        // Use message-specific validation endpoint for chat/message/comment reports
        // For messages and comments, only mark as VALID if content contains offensive/bad words
        // Non-agricultural content is allowed - only flag truly offensive content
        backendUrl = 'https://ai-backend-6-565d.onrender.com/validate-message-report'
        
        const messageText = content?.caption || content?.text || content?.content || ''
        
        requestBody = {
          reporterId,
          reportedUserId: targetUser?.id || targetUser,
          contentType: contentType === 'comment' ? 'comment' : 'message',
          contentId: content?.id || '',
          messageText: messageText,
          mediaType: hasValidMedia ? 'image' : 'text',
          mediaUrl: cleanMediaUrl || cleanImageUrl,
          imageUrls: cleanImageUrls,
          reportType: 'offensive', // Only offensive content should be flagged
          additionalNote: 'IMPORTANT: Only mark as VALID if content contains offensive language, bad words, harassment, cruelty, or threats. Non-agricultural content is ALLOWED and should be marked as INVALID (not a valid report).',
          timestamp
        }
        
        console.log('🔗 Full message/comment report validation URL:', backendUrl)
        console.log('📝 Validation note: Only offensive/bad words/harassment should be marked as VALID')
        console.log('📝 Non-agricultural content is ALLOWED')
      } else {
        // Use general report validation endpoint for other content (posts, comments)
        backendUrl = 'https://ai-backend-6-565d.onrender.com/validate-report'
        
        // Prepare caption based on content type
        let caption = ''
        if (contentType === 'listing') {
          const listingName = content?.caption || content?.name || content?.title || ''
          const listingDetails = content?.text || content?.details || content?.description || content?.content || ''
          caption = listingName + (listingDetails ? ` - ${listingDetails}` : '')
        } else {
          caption = content?.caption || content?.text || content?.content || ''
        }
        
        requestBody = {
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
        
        console.log('🔗 Full report validation URL:', backendUrl)
      }

      // Wait 2 seconds before showing success
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call AI validation backend asynchronously (don't wait for it)
      console.log('🔄 Calling AI validation backend:', backendUrl)
      console.log('📤 Sending validation data:', {
        contentType,
        endpoint: backendUrl.includes('listing-image') ? 'listing-validation' : 'report-validation',
        imageUrl: requestBody.imageUrl ? 'present' : 'none',
        listingName: requestBody.listingName?.substring(0, 50) || 'none',
        listingDetails: requestBody.listingDetails?.substring(0, 50) || 'none'
      })

      fetch(backendUrl, {
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
      .then(async (result) => {
        console.log('🤖 AI validation result:', result)
        console.log('🔍 Raw AI reason for debugging:', result?.result?.reason)
        console.log('🎯 RAW AI VERDICT BEFORE PROCESSING:', result?.result?.verdict)
        console.log('🏷️ RAW AI CATEGORY:', result?.result?.category)
        
        // Update report with AI validation results - use both field names for compatibility
        if (result && result.result) {
          const updateData = {
            aiValidation: result.result,        // Mobile app uses this
            aiValidationResult: result.result,   // Web uses this
            status: 'reviewed',
            reviewedAt: new Date()
          }
          
          // For listing reports, add specific validation metadata
          console.log('🔍 Content type for report validation:', contentType)
          if (contentType === 'listing') {
            updateData.validationType = 'livestock_waste_check'
            
            // Check the AI's original verdict
            const originalVerdict = result.result.verdict
            console.log('🔍 ORIGINAL AI VERDICT:', originalVerdict)
            
            // Determine if this is legitimate livestock waste based on AI analysis
            // The AI should return 'INVALID' for legitimate livestock waste (meaning report is unnecessary)
            const isLegitimateLivestockWaste = originalVerdict === 'INVALID'
            updateData.isValidLivestockWaste = isLegitimateLivestockWaste
            
            console.log('📋 Is legitimate livestock waste (AI said INVALID):', isLegitimateLivestockWaste)
            
            // For listing reports, we preserve the AI's verdict directly
            // AI returns 'INVALID' for legitimate livestock waste (report is unnecessary)
            // AI returns 'VALID' for non-livestock waste (report is justified)
            updateData.aiValidation = { ...result.result }
            updateData.aiValidationResult = { ...result.result }
            
            console.log('✅ FINAL VERDICT (no inversion):', result.result.verdict)
            console.log('✅ FINAL CATEGORY:', result.result.category)
          } else {
            console.log('📋 Non-listing report, keeping original verdict:', result.result.verdict)
          }
          
          // Parse AI response for separate analysis
          if (result.result.reason) {
            const parsed = parseAIResponse(result.result.reason)
            console.log('📝 Parsed text analysis:', parsed.textAnalysis)
            console.log('🖼️ Parsed image analysis:', parsed.imageAnalysis)
            updateData.textAnalysis = parsed.textAnalysis
            updateData.imageAnalysis = parsed.imageAnalysis
          }
          
          // Hide content if report is VALID (violation found)
          const finalVerdict = updateData.aiValidationResult?.verdict || result.result.verdict
          if (finalVerdict === 'VALID') {
            console.log('🚫 Report is VALID - hiding content')
            try {
              // Update content based on type
              if (contentType === 'listing') {
                const listingRef = doc(db, 'livestock_listings', content.id)
                await updateDoc(listingRef, {
                  status: 'hidden',
                  reportVerdict: 'VALID',
                  hiddenAt: new Date(),
                  hiddenBy: 'report_validation',
                  reportId: reportRef.id
                })
              } else if (contentType === 'post') {
                const postRef = doc(db, 'Posts', content.id)
                await updateDoc(postRef, {
                  reportVerdict: 'VALID',
                  hiddenAt: new Date(),
                  hiddenBy: 'report_validation',
                  reportId: reportRef.id
                })
                console.log('✅ Post updated with reportVerdict: VALID')
              } else if (contentType === 'comment') {
                const commentRef = doc(db, 'comments', content.id)
                await updateDoc(commentRef, {
                  reportVerdict: 'VALID',
                  hiddenAt: new Date(),
                  hiddenBy: 'report_validation',
                  reportId: reportRef.id
                })
              }
              
              // Send notification to content owner
              const contentOwnerId = content.ownerId || content.userId
              if (contentOwnerId) {
                const contentName = content.name || content.title || content.text || content.caption || 'content'
                const contentTypeLabel = contentType === 'listing' ? 'listing' : contentType === 'post' ? 'post' : 'comment'
                const navigateTo = contentType === 'listing' ? '/listings' : contentType === 'post' ? '/profile' : '/dashboard'
                
                // Get AI reason from the validation result
                const aiReason = result?.result?.reason || updateData.aiValidationResult?.reason || 'Your content violated community standards.'
                const aiCategory = result?.result?.category || updateData.aiValidationResult?.category || 'violation'
                
                const notificationData = {
                  userId: contentOwnerId,
                  title: `${contentTypeLabel.charAt(0).toUpperCase() + contentTypeLabel.slice(1)} Reported`,
                  message: `Your ${contentTypeLabel} has been reported and hidden due to a violation. Tap to see details and review community standards.`,
                  type: `${contentType}_reported`,
                  data: {
                    contentId: content.id,
                    reportId: reportRef.id,
                    contentType: contentType,
                    aiReason: aiReason,
                    aiCategory: aiCategory,
                    navigateTo: navigateTo,
                    showCommunityStandards: true
                  },
                  isRead: false,
                  createdAt: new Date(),
                  timestamp: new Date()
                }
                
                await addDoc(collection(db, 'notifications'), notificationData)
                console.log(`📬 Notification sent to ${contentTypeLabel} owner with AI reason`)
              }
            } catch (hideError) {
              console.error('❌ Error hiding listing:', hideError)
            }
          }
          
          return updateDoc(doc(db, 'reports', reportRef.id), updateData)
        } else {
          console.error('❌ Invalid AI response format:', result)
        }
      })
      .catch(aiError => {
        console.error('❌ AI validation error:', aiError)
        console.error('Error details:', aiError.message)
        // Report still saved, just without AI validation
      })
      .finally(() => {
        // Show success after loading
        setLoading(false)
        setShowSuccess(true)
      })

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
