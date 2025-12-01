import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, query, where, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getRecommendedListings } from '../utils/recommendationAlgorithm'
import { onAuthStateChanged } from 'firebase/auth'
import { usePopup } from '../contexts/PopupContext'
import ReportModal from '../components/ReportModal'
import { uploadImageToFirebaseStorage } from '../lib/firebaseStorage'
import styles from '../../styles/modules/listings.module.css'

export default function Listings({ initialSelectedListing = null, onClearSelectedListing = null }) {
  const { showInfoPopup, showSuccessPopup, showErrorPopup, showConfirmPopup } = usePopup()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('') // Temporary input value
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredListings, setFilteredListings] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [outsideSearchResults, setOutsideSearchResults] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [showRecentSearches, setShowRecentSearches] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(!!initialSelectedListing)
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [requestStatuses, setRequestStatuses] = useState({})
  const [userLocation, setUserLocation] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [selectedListing, setSelectedListing] = useState(initialSelectedListing)
  const [modalStep, setModalStep] = useState(1) // 1: Basic Info, 2: Measurements, 3: Pricing, 4: Image
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    measurements: '',
    measurementUnit: 'kg',
    price: '',
    isFree: false,
    image: null,
    imagePreview: null
  })
  const [isCreatingListing, setIsCreatingListing] = useState(false)
  const [isRequestingListing, setIsRequestingListing] = useState(false)
  const [isDeletingListing, setIsDeletingListing] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportedListing, setReportedListing] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageAlt, setSelectedImageAlt] = useState('')
  
  // AI Validation states
  const [isImageValidating, setIsImageValidating] = useState(false)
  const [imageValidationResult, setImageValidationResult] = useState(null)
  const [isImageVerified, setIsImageVerified] = useState(false)
  const [validatedImageUrl, setValidatedImageUrl] = useState(null)

  const measurementUnits = ['kg', 'ton', 'sack', 'bag', 'liter', 'cubic meter', 'pieces', 'bundle']

  // Handle initial selected listing from props
  useEffect(() => {
    if (initialSelectedListing) {
      setSelectedListing(initialSelectedListing)
      setShowDetailsModal(true)
      document.body.style.overflow = 'hidden'
    }
  }, [initialSelectedListing])

  // Function to truncate title to 20 characters
  const truncateTitle = (title, maxLength = 20) => {
    if (!title) return 'Unnamed Listing'
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  // Image modal functions
  const openImageModal = (imageUrl, imageAlt) => {
    setSelectedImage(imageUrl)
    setSelectedImageAlt(imageAlt)
    setShowImageModal(true)
    document.body.style.overflow = 'hidden'
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
    setSelectedImageAlt('')
    document.body.style.overflow = 'auto'
  }

  // Handle ESC key for image modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && showImageModal) {
        closeImageModal()
      }
    }

    if (showImageModal) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [showImageModal])

  // Function to get button text and state based on request status
  const getButtonState = (listingId) => {
    const status = requestStatuses[listingId]
    
    if (!status) {
      return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
    }
    
    switch (status) {
      case 'pending':
        return { text: 'Cancel Request', disabled: false, onClick: () => handleCancelRequest }
      case 'approved':
        return { text: 'Approved ✓', disabled: true, onClick: null }
      case 'rejected':
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
      case 'cancelled':
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
      default:
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
    }
  }

  // Modal functions
  // AI Validation function
  const validateImageWithAI = async (imageFile, listingName, listingDetails, existingImageUrl = null) => {
    if (!imageFile) return null
    
    setIsImageValidating(true)
    setImageValidationResult(null)
    
    try {
      // Use existing image URL if provided (for re-validation), otherwise upload
      let imageUrl = existingImageUrl
      if (!imageUrl) {
        console.log('📤 Uploading image for AI validation...')
        imageUrl = await uploadImageToFirebaseStorage(imageFile, 'Images/Listing-Validation', user.uid)
      }
      
      // Call AI validation backend
      console.log('🤖 Calling AI validation service...')
      const aiValidationUrl = process.env.NEXT_PUBLIC_AI_VALIDATION_URL || 'https://ai-backend-6-565d.onrender.com/validate-listing-image'
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout for Render cold starts
      
      const response = await fetch(aiValidationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          listingName: listingName || '',
          listingDetails: listingDetails || ''
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`AI validation failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ AI validation result:', result)
      
      if (result.status === 'success') {
        setImageValidationResult(result.result)
        const isVerified = result.result.verdict === 'VERIFIED_LEGITIMATE'
        setIsImageVerified(isVerified)
        setValidatedImageUrl(imageUrl)
        
        // Show appropriate popup message only for non-legitimate cases
        if (!isVerified) {
          if (result.result.verdict === 'VERIFIED_NOT_LEGITIMATE') {
            // Removed popup - user doesn't want any AI verification popups
          } else {
            // Removed popup - user doesn't want any AI verification popups
          }
        }
        
        return { ...result.result, validatedImageUrl: imageUrl }
      } else {
        throw new Error(result.error || 'AI validation service error')
      }
    } catch (error) {
      console.error('❌ AI validation error:', error)
      if (error.name === 'AbortError') {
        showErrorPopup('Validation Timeout', 'The AI service is taking longer than expected to respond. This is normal on first use. Please try again in a moment.')
      } else {
        showErrorPopup('Validation Error', `Failed to validate image: ${error.message}. You can still create your listing without AI verification.`)
      }
      return null
    } finally {
      setIsImageValidating(false)
    }
  }

  // Re-validate image function
  const revalidateImage = async () => {
    if (formData.image && formData.name && formData.details) {
      await validateImageWithAI(formData.image, formData.name, formData.details, validatedImageUrl)
    }
  }

  // Check if all steps are completed
  const areAllStepsCompleted = () => {
    const step1Complete = formData.name.trim() && formData.details.trim()
    const step2Complete = formData.measurements && formData.measurementUnit
    const step3Complete = formData.isFree || (formData.price && parseFloat(formData.price) > 0)
    const step4Complete = formData.image !== null
    
    return step1Complete && step2Complete && step3Complete && step4Complete
  }

  // Check if current step is valid for Next button
  const isCurrentStepValid = () => {
    if (modalStep === 1) {
      return formData.name.trim() && formData.details.trim()
    } else if (modalStep === 2) {
      return formData.measurements && formData.measurementUnit
    } else if (modalStep === 3) {
      return formData.isFree || (formData.price && parseFloat(formData.price) > 0)
    }
    return true // Step 4 doesn't need Next button
  }

  const openAddModal = () => {
    console.log('📝 Opening add listing modal for user:', { 
      uid: user?.uid, 
      role: userRole, 
      email: user?.email 
    })
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null,
      imagePreview: null
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingListing(null)
    setModalStep(1)
    setIsImageValidating(false)
    setImageValidationResult(null)
    setIsImageVerified(false)
    setValidatedImageUrl(null)
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null,
      imagePreview: null
    })
  }

  const nextStep = () => {
    // Validation for each step
    if (modalStep === 1) {
      if (!formData.name.trim() || !formData.details.trim()) {
        showErrorPopup('Required Fields', 'Please fill in listing title and description')
        return
      }
    } else if (modalStep === 2) {
      if (!formData.measurements || !formData.measurementUnit) {
        showErrorPopup('Required Fields', 'Please fill in quantity and unit of measurement')
        return
      }
    } else if (modalStep === 3) {
      if (!formData.isFree && !formData.price) {
        showErrorPopup('Required Fields', 'Please enter a price or mark as free')
        return
      }
    }
    setModalStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setModalStep(prev => Math.max(prev - 1, 1))
  }

  const openEditModal = (listing) => {
    setFormData({
      name: listing.name || '',
      details: listing.details || '',
      measurements: listing.measurements || '',
      measurementUnit: listing.measurementUnit || 'kg',
      price: listing.isFree ? '' : (listing.price === 'Free' ? '' : listing.price || ''),
      isFree: listing.isFree || listing.price === 'Free',
      image: listing.image || null,
      imagePreview: listing.image || null
    })
    setEditingListing(listing)
    setShowAddModal(true)
  }

  const deleteListing = async (listing) => {
    const confirmed = await showConfirmPopup(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      null,
      { danger: true, confirmText: 'Delete' }
    )
    
    if (confirmed) {
      setIsDeletingListing(true)
      try {
        // Update listing status to 'deleted' instead of deleting
        await updateDoc(doc(db, 'livestock_listings', listing.id), {
          status: 'deleted',
          deletedAt: serverTimestamp()
        })
        showSuccessPopup('Success', 'Listing deleted successfully')
      } catch (error) {
        console.error('Error deleting listing:', error)
        showErrorPopup('Error', 'Failed to delete listing')
      } finally {
        setIsDeletingListing(false)
      }
    }
  }

  const markAsSold = async (listing) => {
    const confirmed = await showConfirmPopup(
      'Mark as Sold',
      'Are you sure you want to mark this listing as sold? This will remove it from active listings.'
    )
    
    if (confirmed) {
      try {
        await updateDoc(doc(db, 'livestock_listings', listing.id), {
          status: 'sold',
          soldAt: serverTimestamp()
        })
        showSuccessPopup('Success', 'Listing marked as sold')
      } catch (error) {
        console.error('Error marking listing as sold:', error)
        showErrorPopup('Error', 'Failed to mark listing as sold')
      }
    }
  }

  const openDetailsModal = (listing) => {
    setSelectedListing(listing)
    setShowDetailsModal(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedListing(null)
    // Clear the initial selected listing in parent component
    if (onClearSelectedListing) {
      onClearSelectedListing()
    }
    // Restore background scrolling
    document.body.style.overflow = 'unset'
  }

  // Handle report listing
  const handleReportListing = (listing) => {
    if (!user) {
      showErrorPopup('Authentication Required', 'Please sign in to report a listing.')
      return
    }
    // Debug: Log the listing object to see what fields are available
    console.log('🔍 Reporting listing:', {
      id: listing?.id,
      name: listing?.name,
      image: listing?.image,
      images: listing?.images,
      imageUrl: listing?.imageUrl,
      imageUrls: listing?.imageUrls,
      fullListing: listing
    })
    setReportedListing(listing)
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setReportedListing(null)
  }

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('listingRecentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Handle escape key press and click outside
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showDetailsModal) {
          closeDetailsModal()
        }
        if (showAddModal) {
          closeModal()
        }
        if (showRecentSearches) {
          setShowRecentSearches(false)
        }
      }
    }

    const handleClickOutside = (event) => {
      if (showRecentSearches && !event.target.closest(`.${styles.searchContainer}`)) {
        setShowRecentSearches(false)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDetailsModal, showAddModal, showRecentSearches])

  const saveListing = async () => {
    console.log('🚀 saveListing called with formData:', formData)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email, role: userRole })
    console.log('🔥 Database initialized:', !!db)

    // Validate all required fields first
    if (!formData.name.trim()) {
      showErrorPopup('Validation Error', 'Please enter a listing title')
      return
    }

    if (!formData.details.trim()) {
      showErrorPopup('Validation Error', 'Please enter a description')
      return
    }

    if (!formData.measurements || formData.measurements <= 0) {
      showErrorPopup('Validation Error', 'Please enter a valid quantity')
      return
    }

    if (!formData.measurementUnit) {
      showErrorPopup('Validation Error', 'Please select unit of measurement')
      return
    }

    if (!formData.isFree && (!formData.price || formData.price <= 0)) {
      showErrorPopup('Validation Error', 'Please enter a valid price or mark as free')
      return
    }

    if (!formData.image) {
      showErrorPopup('Validation Error', 'Please add an image')
      return
    }

    if (!user) {
      showErrorPopup('Authentication Error', 'User not authenticated. Please sign in again.')
      return
    }

    if (!db) {
      showErrorPopup('Database Error', 'Database not initialized. Please refresh the page.')
      return
    }

    // Show loading state and close modal for new listings
    const isUpdating = !!editingListing
    setIsCreatingListing(true)
    
    if (!isUpdating) {
      // Close modal immediately for new listings
      closeModal()
    }

    try {
      let imageUrl = null
      
      // Use validated image URL if available to avoid re-uploading
      if (validatedImageUrl) {
        console.log('📤 Reusing validated image URL:', validatedImageUrl)
        imageUrl = validatedImageUrl
      } else if (formData.image && formData.image instanceof File) {
        console.log('📤 Uploading image to Firebase Storage...')
        try {
          imageUrl = await uploadImageToFirebaseStorage(formData.image, 'Images/Listing', user.uid)
          console.log('✅ Image uploaded successfully:', imageUrl)
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError)
          setIsCreatingListing(false)
          showErrorPopup('Upload Error', `Failed to upload image: ${uploadError.message}`)
          // Reopen modal if it was closed for new listing
          if (!isUpdating) {
            setShowAddModal(true)
          }
          return
        }
      } else if (formData.image && typeof formData.image === 'string') {
        // Handle base64 fallback (should not happen with new implementation)
        console.warn('⚠️ Image is base64 string, should be File object')
        imageUrl = formData.image
      }

      const listingData = {
        name: formData.name.trim(),
        details: formData.details.trim(),
        measurements: formData.measurements.trim(),
        measurementUnit: formData.measurementUnit,
        price: formData.isFree ? 'Free' : formData.price.trim(),
        isFree: formData.isFree,
        imageUrl: imageUrl, // Store as imageUrl for consistency with mobile app
        ownerId: user.uid,
        ownerName: user.displayName || user.email || 'Livestock Owner',
        ownerEmail: user.email || '',
        updatedAt: serverTimestamp(),
        // Add AI verification data
        isAiVerified: isImageVerified || false,
        aiValidationResult: imageValidationResult || null
      }

      console.log('📝 Listing data to save:', listingData)

      if (editingListing) {
        // Update existing listing
        console.log('🔄 Updating existing listing:', editingListing.id)
        await updateDoc(doc(db, 'livestock_listings', editingListing.id), listingData)
        console.log('✅ Listing updated successfully')
        showSuccessPopup('Success', 'Listing updated successfully')
      } else {
        // Create new listing
        listingData.createdAt = serverTimestamp()
        console.log('🆕 Creating new listing...')
        const docRef = await addDoc(collection(db, 'livestock_listings'), listingData)
        console.log('✅ New listing created with ID:', docRef.id)
        showSuccessPopup('Success', 'Listing created successfully')
      }
      
      setIsCreatingListing(false)
      closeModal()
    } catch (error) {
      console.error('❌ Error saving listing:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        userId: user?.uid
      })
      
      let errorMessage = 'Failed to save listing. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      }
      
      setIsCreatingListing(false)
      showErrorPopup('Error', errorMessage)
      // Reopen modal if it was closed for new listing
      if (!isUpdating) {
        setShowAddModal(true)
      }
    }
  }

  // Handle cancel request
  const handleCancelRequest = async (listingId) => {
    console.log('🚀 handleCancelRequest called for listing:', listingId)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email })
    console.log('🔥 Database initialized:', !!db)

    if (!user) {
      console.error('❌ No user found')
      setIsCreatingListing(false)
      showErrorPopup('Error', 'You must be logged in to create a listing')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      setIsCreatingListing(false)
      showErrorPopup('Connection Error', 'Database connection error. Please refresh the page.')
      return
    }

    if (!confirm('Are you sure you want to cancel this request?')) return

    try {
      console.log('🔍 Step 1: Searching for request to cancel...')
      
      // Find the request to cancel
      const requestsQuery = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', user.uid),
        where('listingId', '==', listingId)
      )
      
      console.log('📝 Query parameters:', {
        collection: 'listing_requests',
        requesterId: user.uid,
        listingId: listingId
      })
      
      const requestsSnapshot = await getDocs(requestsQuery)
      console.log('📊 Query results:', {
        empty: requestsSnapshot.empty,
        size: requestsSnapshot.size
      })
      
      if (!requestsSnapshot.empty) {
        console.log('✅ Found request to cancel')
        const requestDoc = requestsSnapshot.docs[0]
        const requestData = requestDoc.data()
        console.log('📋 Request data:', {
          id: requestDoc.id,
          listingName: requestData.listingName,
          listingOwnerId: requestData.listingOwnerId,
          status: requestData.status
        })
        
        console.log('💬 Step 2: Updating chat and sending message...')
        
        // Send cancellation message to the chat between users
        const participants = [user.uid, requestData.listingOwnerId].sort()
        const chatId = `${user.uid}_crop_farmer_to_${requestData.listingOwnerId}_livestock_owner_listing_${requestData.listingId}`
        const chatRef = doc(db, 'chats', chatId)
        
        console.log('📝 Chat details:', {
          participants: participants,
          chatId: chatId
        })
        
        try {
          // Check if chat exists first
          const chatDoc = await getDoc(chatRef)
          
          if (chatDoc.exists()) {
            // Update chat status to cancelled
            await updateDoc(chatRef, {
              requestStatus: 'cancelled',
              cancelledAt: serverTimestamp(),
              lastMessage: `Request cancelled for listing: ${requestData.listingName}`,
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid
            })
            console.log('✅ Chat status updated to cancelled')
          } else {
            console.log('⚠️ Chat document does not exist, trying fallback chat ID format...')
            
            // Try old chat ID format as fallback
            const fallbackChatId = participants.join('_')
            const fallbackChatRef = doc(db, 'chats', fallbackChatId)
            const fallbackChatDoc = await getDoc(fallbackChatRef)
            
            if (fallbackChatDoc.exists()) {
              await updateDoc(fallbackChatRef, {
                requestStatus: 'cancelled',
                cancelledAt: serverTimestamp(),
                lastMessage: `Request cancelled for listing: ${requestData.listingName}`,
                lastMessageTime: serverTimestamp(),
                lastMessageSenderId: user.uid
              })
              console.log('✅ Fallback chat status updated to cancelled')
            } else {
              console.log('⚠️ No chat document found with either format, skipping chat update')
            }
          }
        } catch (chatUpdateError) {
          console.error('❌ Failed to update chat status:', chatUpdateError)
          // Continue with cancellation even if chat update fails
        }
        
        try {
          const messageData = {
            text: `I have cancelled my request for "${requestData.listingName}". Thank you for your time.`,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Crop Farmer',
            createdAt: serverTimestamp(),
            read: false,
            type: 'request_cancellation'
          }

          // Try to add message to the chat (try both chat ID formats)
          try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
            console.log('✅ Cancellation message sent to chat')
          } catch (primaryMessageError) {
            console.log('⚠️ Failed to send message with primary chat ID, trying fallback...')
            const fallbackChatId = participants.join('_')
            await addDoc(collection(db, 'chats', fallbackChatId, 'messages'), messageData)
            console.log('✅ Cancellation message sent to fallback chat')
          }
        } catch (messageError) {
          console.error('❌ Failed to send cancellation message:', messageError)
          // Continue with cancellation even if message fails
        }

        console.log('🔄 Step 3: Updating original request message...')
        
        // Find and update the original request message to mark as cancelled
        try {
          // Try primary chat ID first
          let messagesRef = collection(db, 'chats', chatId, 'messages')
          let requestQuery = query(
            messagesRef,
            where('senderId', '==', user.uid),
            where('listingId', '==', requestData.listingId),
            where('isListingRequest', '==', true)
          )
          
          let requestSnapshot = await getDocs(requestQuery)
          
          // If no messages found, try fallback chat ID
          if (requestSnapshot.empty) {
            console.log('⚠️ No messages found with primary chat ID, trying fallback...')
            const fallbackChatId = participants.join('_')
            messagesRef = collection(db, 'chats', fallbackChatId, 'messages')
            requestQuery = query(
              messagesRef,
              where('senderId', '==', user.uid),
              where('listingId', '==', requestData.listingId),
              where('isListingRequest', '==', true)
            )
            requestSnapshot = await getDocs(requestQuery)
          }
          
          // Update all matching request messages to mark as cancelled
          const updatePromises = requestSnapshot.docs.map(requestDoc => 
            updateDoc(requestDoc.ref, { 
              isCancelled: true,
              cancelledAt: serverTimestamp(),
              requestStatus: 'cancelled'
            })
          )
          
          await Promise.all(updatePromises)
          console.log(`✅ Marked ${updatePromises.length} request messages as cancelled`)
        } catch (updateError) {
          console.error('❌ Error updating original request message:', updateError)
          // Continue with cancellation even if message update fails
        }

        console.log('🔄 Step 4: Updating request status to cancelled...')
        
        // Update request status to cancelled instead of deleting
        await updateDoc(requestDoc.ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        })
        console.log('✅ Request status updated to cancelled successfully')
        
        // The onSnapshot listener will automatically update requestedListings
        // when the document status is updated
        console.log('✅ Request deleted from database, waiting for real-time update...')
        
        // Fallback: Force state update after a short delay if real-time doesn't work
        setTimeout(() => {
          setRequestedListings(prev => {
            const newSet = new Set(prev)
            if (newSet.has(listingId)) {
              console.log('⚠️ Fallback: Manually removing listing from state')
              newSet.delete(listingId)
              return newSet
            }
            return prev
          })
        }, 1000) // Wait 1 second for real-time update, then fallback
        
        showSuccessPopup('Request Cancelled', 'Your request has been cancelled successfully and the owner has been notified.')
      } else {
        console.error('❌ No request found to cancel')
        console.log('🔍 Debugging info:', {
          userUid: user.uid,
          listingId: listingId,
          queryCollection: 'listing_requests'
        })
        showInfoPopup('No Active Request', 'No active request found for this listing. It may have already been cancelled or processed.')
      }
    } catch (error) {
      console.error('❌ Error cancelling request:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        listingId: listingId,
        userId: user.uid
      })
      
      let errorMessage = 'Failed to cancel request. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Authentication error. Please sign out and sign in again.'
      }
      
      showErrorPopup('Error', errorMessage)
    }
  }

  // Simplified cancel request function (fallback)
  const handleCancelRequestSimple = async (listingId) => {
    console.log('🔄 Using simplified cancel request for listing:', listingId)
    
    if (!user || !db) {
      showErrorPopup('Authentication Required', 'Please sign in and refresh the page.')
      return
    }

    if (!confirm('Are you sure you want to cancel this request?')) return

    try {
      // Find and delete the request directly
      const requestsQuery = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', user.uid),
        where('listingId', '==', listingId)
      )
      
      const requestsSnapshot = await getDocs(requestsQuery)
      
      if (!requestsSnapshot.empty) {
        const requestDoc = requestsSnapshot.docs[0]
        await updateDoc(requestDoc.ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        })
        
        // Force immediate state update
        setRequestedListings(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
        
        console.log('✅ Simplified cancellation successful')
        showSuccessPopup('Request Cancelled', 'Your request has been cancelled successfully!')
      } else {
        showInfoPopup('No Active Request', 'No active request found for this listing.')
      }
    } catch (error) {
      console.error('❌ Simplified cancellation failed:', error)
      showErrorPopup('Request Failed', 'Failed to send request. Please try again.')
    } finally {
      // Ensure loading state is hidden
      setIsRequestingListing(false)
    }
  }

  // Handle listing request
  const handleListingRequest = async (listing) => {
    console.log('🚀 handleListingRequest called')
    console.log('📊 Initial validation:', {
      hasUser: !!user,
      hasListing: !!listing,
      hasDb: !!db,
      userRole: userRole,
      userId: user?.uid,
      listingId: listing?.id
    })

    // Basic validation
    if (!user) {
      console.error('❌ No user authenticated')
      showErrorPopup('Authentication Required', 'Please sign in to send requests.')
      return
    }

    if (!listing) {
      console.error('❌ No listing provided')
      showErrorPopup('Invalid Listing', 'Invalid listing data. Please try again.')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      showErrorPopup('Connection Error', 'Database connection error. Please refresh the page and try again.')
      return
    }

    // Validate required listing fields
    if (!listing.id) {
      console.error('❌ Listing missing ID:', listing)
      showErrorPopup('Invalid Data', 'Invalid listing data. Please refresh the page and try again.')
      return
    }

    if (!listing.ownerId) {
      console.error('❌ Listing missing owner ID:', listing)
      showErrorPopup('Owner Not Found', 'Unable to identify listing owner. Please try again.')
      return
    }

    if (listing.ownerId === user.uid) {
      showInfoPopup('Own Listing', 'You cannot request your own listing.')
      return
    }


    console.log('🚀 Starting request for listing:', listing.id, 'by user:', user.uid)
    console.log('📋 Full listing object:', listing)
    console.log('📋 Listing data extracted:', {
      id: listing.id,
      name: listing.name || listing.title,
      ownerId: listing.ownerId,
      ownerName: listing.ownerName,
      ownerEmail: listing.ownerEmail,
      price: listing.price,
      measurements: listing.measurements,
      details: listing.details || listing.description
    })
    console.log('👤 User data:', {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email
    })

    // Show loading state
    setIsRequestingListing(true)

    try {
      // Step 1: Create request record
      console.log('📝 Step 1: Preparing request data...')
      const requestData = {
        listingId: listing.id,
        listingName: listing.name || listing.title,
        listingOwnerName: listing.ownerName,
        listingOwnerId: listing.ownerId,
        requesterId: user.uid,
        requesterName: user.displayName || user.email || 'Crop Farmer',
        requesterEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        listing: {
          name: listing.name || listing.title,
          price: listing.price,
          measurements: listing.measurements,
          details: listing.details || listing.description
        }
      }
      console.log('✅ Request data prepared:', requestData)

      // Step 2: Add to listing_requests collection
      console.log('🔥 Step 2: Adding to listing_requests collection...')
      let docRef
      try {
        docRef = await addDoc(collection(db, 'listing_requests'), requestData)
        console.log('✅ Request created with ID:', docRef.id)
      } catch (requestError) {
        console.error('❌ Failed at Step 2 - Creating request:', requestError)
        throw new Error(`Request creation failed: ${requestError.message}`)
      }

      // Step 3: Create chat and send initial message
      console.log('💬 Step 3: Creating chat and sending message...')
      const participants = [user.uid, listing.ownerId].sort()
      const chatId = `${user.uid}_crop_farmer_to_${listing.ownerId}_livestock_owner_listing_${listing.id}`
      const chatRef = doc(db, 'chats', chatId)
      
      try {
        // Check if chat exists
        const chatDoc = await getDoc(chatRef)
        
        if (!chatDoc.exists()) {
          // Create new chat
          const chatData = {
            participants: participants,
            participantRoles: {
              [user.uid]: 'crop_farmer',
              [listing.ownerId]: 'livestock_owner'
            },
            participantNames: {
              [user.uid]: `${user.firstName || 'Crop'} ${user.lastName || 'Farmer'}`,
              [listing.ownerId]: listing.ownerName || 'Livestock Owner'
            },
            participantEmails: {
              [user.uid]: user.email || '',
              [listing.ownerId]: listing.ownerEmail || ''
            },
            listingId: listing.id,
            listingName: listing.name || 'Unnamed Listing',
            chatType: 'crop_farmer_to_livestock_owner',
            initiatorRole: 'crop_farmer',
            receiverRole: 'livestock_owner',
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageTime: serverTimestamp()
          }
          
          console.log('🔍 WEB CHAT: Creating chat with data:', {
            chatId: chatId,
            participants: chatData.participants,
            participantRoles: chatData.participantRoles,
            chatType: chatData.chatType,
            initiatorRole: chatData.initiatorRole,
            receiverRole: chatData.receiverRole
          })
          
          await setDoc(chatRef, chatData)
          console.log('✅ Chat created successfully')
        }

        // Send initial message
        const messageData = {
          text: `I am interested in your listing: ${listing.name || listing.title}. Please review my request.`,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'Crop Farmer',
          createdAt: serverTimestamp(),
          read: false,
          isListingRequest: true,
          listingId: listing.id,
          listingTitle: listing.name || listing.title,
          requestStatus: 'pending',
          requestId: docRef.id
        }

        console.log('📤 WEB CHAT: Sending message with data:', {
          chatId: chatId,
          isListingRequest: messageData.isListingRequest,
          listingId: messageData.listingId,
          listingTitle: messageData.listingTitle,
          requestStatus: messageData.requestStatus
        })

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
        
        // Update chat's last message
        await updateDoc(chatRef, {
          lastMessage: messageData.text,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.uid
        })
        
        console.log('✅ Message sent to chat')
      } catch (chatError) {
        console.error('❌ Failed at Step 3 - Chat creation:', chatError)
        // Don't throw error here, as the request was already created successfully
        console.log('⚠️ Request created but chat/message failed')
      }

      // Step 4: Create notification for listing owner
      console.log('🔔 Step 4: Creating notification for listing owner...')
      const notificationData = {
        toUserId: listing.ownerId,
        fromUserId: user.uid,
        fromUserName: user.displayName || user.email || 'Crop Farmer',
        type: 'listing_request',
        title: 'New Listing Request',
        message: `${user.displayName || user.email || 'A crop farmer'} is interested in your listing: ${listing.name || listing.title}`,
        listingId: listing.id,
        listingName: listing.name || listing.title,
        requestId: docRef.id,
        chatId: chatId,
        read: false,
        createdAt: serverTimestamp()
      }

      try {
        const notificationRef = await addDoc(collection(db, 'notifications'), notificationData)
        console.log('✅ Notification sent to listing owner with ID:', notificationRef.id)
        console.log('📋 Notification data:', notificationData)
      } catch (notificationError) {
        console.error('❌ Failed at Step 4 - Creating notification:', notificationError)
        // Don't throw error here, as the request was already created successfully
        console.log('⚠️ Request created but notification failed')
      }

      // Step 6: Update local state
      console.log('✅ Step 6: Updating local state...')
      setRequestedListings(prev => {
        const newSet = new Set([...prev, listing.id])
        console.log('📊 Updated requestedListings after request:', Array.from(newSet))
        return newSet
      })
      
      // Immediately update request status to show "Cancel Request" button
      setRequestStatuses(prev => ({
        ...prev,
        [listing.id]: 'pending'
      }))
      
      console.log('🎉 Request process completed successfully for listing:', listing.id)
      
      // Hide loading state
      setIsRequestingListing(false)
      
      showSuccessPopup('Request Sent!', 'Your request has been sent to the listing owner. They will be notified and can approve your request in their chat.')
    } catch (error) {
      // Hide loading state on error
      setIsRequestingListing(false)
      console.error('❌ Error sending request:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        listingId: listing.id,
        userId: user.uid
      })
      
      // Try simplified request creation as fallback
      console.log('🔄 Attempting simplified request creation...')
      try {
        const simpleRequestData = {
          listingId: listing.id,
          listingName: listing.name || 'Unnamed Listing',
          listingOwnerId: listing.ownerId,
          requesterId: user.uid,
          requesterName: user.displayName || user.email || 'Crop Farmer',
          status: 'pending',
          createdAt: serverTimestamp()
        }
        
        const fallbackDocRef = await addDoc(collection(db, 'listing_requests'), simpleRequestData)
        console.log('✅ Simplified request created with ID:', fallbackDocRef.id)
        
        // Try to create chat and send message in fallback too
        try {
          const participants = [user.uid, listing.ownerId].sort()
          const chatId = `${user.uid}_crop_farmer_to_${listing.ownerId}_livestock_owner_listing_${listing.id}`
          const chatRef = doc(db, 'chats', chatId)
          
          // Check if chat exists
          const chatDoc = await getDoc(chatRef)
          
          if (!chatDoc.exists()) {
            // Create new chat
            const chatData = {
              participants: participants,
              participantRoles: {
                [user.uid]: 'crop_farmer',
                [listing.ownerId]: 'livestock_owner'
              },
              participantNames: {
                [user.uid]: user.displayName || user.email || 'Crop Farmer',
                [listing.ownerId]: listing.ownerName
              },
              participantEmails: {
                [user.uid]: user.email || '',
                [listing.ownerId]: listing.ownerEmail || ''
              },
              listingId: listing.id,
              listingName: listing.name || 'Unnamed Listing',
              chatType: 'crop_farmer_to_livestock_owner',
              initiatorRole: 'crop_farmer',
              receiverRole: 'livestock_owner',
              createdAt: serverTimestamp(),
              lastMessage: `I am interested in your listing: ${listing.name || listing.title}`,
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid,
              requestStatus: 'pending',
              requestId: fallbackDocRef.id,
              updatedAt: serverTimestamp()
            }
            
            await setDoc(chatRef, chatData)
          }

          // Send initial message
          const messageData = {
            text: `I am interested in your listing: ${listing.name || listing.title}. Please review my request.`,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Crop Farmer',
            createdAt: serverTimestamp(),
            read: false,
            isListingRequest: true,
            listingId: listing.id,
            listingTitle: listing.name || listing.title,
            requestStatus: 'pending',
            requestId: fallbackDocRef.id
          }

          await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
          
          // Update chat's last message
          await updateDoc(chatRef, {
            lastMessage: messageData.text,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: user.uid
          })
          
          console.log('✅ Fallback chat and message sent')
        } catch (fallbackChatError) {
          console.error('⚠️ Fallback chat failed:', fallbackChatError)
        }

        // Try to send notification in fallback too
        try {
          const fallbackNotificationData = {
            toUserId: listing.ownerId,
            fromUserId: user.uid,
            fromUserName: user.displayName || user.email || 'Crop Farmer',
            type: 'listing_request',
            title: 'New Listing Request',
            message: `${user.displayName || user.email || 'A crop farmer'} is interested in your listing: ${listing.name || listing.title}`,
            listingId: listing.id,
            listingName: listing.name || listing.title,
            requestId: fallbackDocRef.id,
            read: false,
            createdAt: serverTimestamp()
          }
          await addDoc(collection(db, 'notifications'), fallbackNotificationData)
          console.log('✅ Fallback notification sent')
        } catch (fallbackNotificationError) {
          console.error('⚠️ Fallback notification failed:', fallbackNotificationError)
        }
        
        setRequestedListings(prev => new Set([...prev, listing.id]))
        
        // Immediately update request status for fallback too
        setRequestStatuses(prev => ({
          ...prev,
          [listing.id]: 'pending'
        }))
        
        // Hide loading state before showing success popup
        setIsRequestingListing(false)
        
        showSuccessPopup('Request Sent!', 'Your request has been sent to the listing owner. They will be notified and can respond in their chat.')
        return
      } catch (fallbackError) {
        console.error('❌ Fallback request also failed:', fallbackError)
      }
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to send request. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Authentication error. Please sign out and sign in again.'
      }
      
      showErrorPopup('Request Failed', errorMessage)
    }
  }

  // Auth state listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            if (userData.location && typeof userData.location === 'object') {
              setUserLocation(userData.location)
            } else {
              setUserLocation(null)
            }
          } else {
            setUserRole('crop_farmer')
            setUserLocation(null)
          }
        } catch (error) {
          setError('Failed to load user role')
          setUserRole('crop_farmer')
          setUserLocation(null)
        }
      } else {
        setUser(null)
        setUserRole(null)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [auth, db])

  // Load existing requests for crop farmers
  useEffect(() => {
    if (!user || !db || userRole !== 'crop_farmer') return

    console.log('🔍 Setting up real-time listener for requests by user:', user.uid)
    
    const q = query(
      collection(db, 'listing_requests'),
      where('requesterId', '==', user.uid),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Requested listings snapshot update:', {
        size: snapshot.size,
        docChanges: snapshot.docChanges().length
      })
      
      const requestedIds = new Set()
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('📋 Found request for listing:', data.listingId)
        requestedIds.add(data.listingId)
      })
      
      console.log('✅ Updated requestedListings state:', Array.from(requestedIds))
      setRequestedListings(requestedIds)
    }, (error) => {
      console.error('Error loading existing requests:', error)
    })

    return () => unsubscribe()
  }, [user, userRole])

  // Load all request statuses for crop farmers (to track approved/rejected requests)
  useEffect(() => {
    if (!user || !db || userRole !== 'crop_farmer') return

    console.log('🔍 Setting up listener for all request statuses by user:', user.uid)
    
    const q = query(
      collection(db, 'listing_requests'),
      where('requesterId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statuses = {}
      snapshot.forEach((doc) => {
        const data = doc.data()
        statuses[data.listingId] = data.status
      })
      
      console.log('📊 Updated request statuses:', statuses)
      setRequestStatuses(statuses)
    }, (error) => {
      console.error('Error loading request statuses:', error)
    })

    return () => unsubscribe()
  }, [user, userRole])


  // Fetch listings for livestock owners (real-time snapshot)
  useEffect(() => {
    if (!db || authLoading || !user || userRole !== 'livestock_owner') return

    setLoading(true)
    setError(null)

    const listingsRef = collection(db, 'livestock_listings')
    const q = query(listingsRef, where('ownerId', '==', user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Listings snapshot received (livestock_owner):', {
        userId: user.uid,
        snapshotSize: snapshot.size,
        isEmpty: snapshot.empty
      })

      const listingsData = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        listingsData.push({
          id: docSnap.id,
          ...data
        })
      })

      console.log('✅ Total listings loaded (livestock_owner):', listingsData.length)
      setListings(listingsData)
      setFilteredListings(listingsData)
      setLoading(false)
    }, (error) => {
      console.error('❌ Error loading listings for livestock owner:', error)
      setError('Failed to load listings')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [db, user, userRole, authLoading])

  // Fetch listings for crop farmers using context-based recommendation algorithm
  useEffect(() => {
    if (!db || authLoading || !user || userRole !== 'crop_farmer') return

    const loadRecommendedListings = async () => {
      setLoading(true)
      setError(null)

      try {
        console.log('🔄 Loading recommended listings for crop farmer...', {
          userId: user.uid,
          searchQuery: searchQuery || 'none'
        })

        const result = await getRecommendedListings(user.uid, {
          limit: 100,
          minScore: 0.0,
          searchQuery: searchQuery.trim() || null
        })

        console.log('✅ Recommended listings loaded:', {
          searchResults: result.searchResults?.length || 0,
          outsideSearchResults: result.outsideSearchResults?.length || 0,
          hasSearchQuery: result.hasSearchQuery
        })

        let combinedListings = []

        if (result.hasSearchQuery && result.searchResults.length === 0) {
          // No direct matches - show context-based outside search recommendations
          combinedListings = result.outsideSearchResults || []
        } else {
          combinedListings = result.searchResults || []
        }

        setListings(combinedListings)
        setFilteredListings(combinedListings)
      } catch (err) {
        console.error('❌ Error loading recommended listings for crop farmer:', err)
        setError('Failed to load listings')
      } finally {
        setLoading(false)
      }
    }

    loadRecommendedListings()
  }, [db, user, userRole, authLoading, searchQuery])

  // Search handling functions
  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value)
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      performSearch(searchInput.trim())
      setShowRecentSearches(false)
    }
  }

  const performSearch = (query) => {
    setSearchQuery(query)
    setSearchInput(query) // Keep the input value
    
    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('listingRecentSearches', JSON.stringify(updated))

    // Filter listings
    if (userRole === 'crop_farmer') {
      const searchLower = query.toLowerCase()
      const matchingListings = listings.filter(listing =>
        listing.name?.toLowerCase().includes(searchLower) ||
        listing.details?.toLowerCase().includes(searchLower) ||
        listing.ownerName?.toLowerCase().includes(searchLower)
      )
      
      const nonMatchingListings = listings.filter(listing =>
        !(listing.name?.toLowerCase().includes(searchLower) ||
          listing.details?.toLowerCase().includes(searchLower) ||
          listing.ownerName?.toLowerCase().includes(searchLower))
      )
      
      // Sort both by distance (nearest first)
      const sortByDistance = (a, b) => {
        const distA = a.distanceKm ?? Infinity
        const distB = b.distanceKm ?? Infinity
        return distA - distB
      }
      
      matchingListings.sort(sortByDistance)
      nonMatchingListings.sort(sortByDistance)
      
      setSearchResults(matchingListings)
      setOutsideSearchResults(nonMatchingListings)
    }
  }

  const handleRecentSearchClick = (search) => {
    setSearchInput(search)
    performSearch(search)
    setShowRecentSearches(false)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('listingRecentSearches')
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchInput('')
    setSearchResults([])
    setOutsideSearchResults([])
  }

  // Filter listings based on search query for livestock owners only
  useEffect(() => {
    // Filter out sold and deleted listings for all users
    const activeListings = listings.filter(listing => 
      listing.status !== 'sold' && listing.status !== 'deleted'
    )
    
    if (userRole === 'crop_farmer') {
      // For crop farmers, listings already come from the recommendation algorithm
      setFilteredListings(activeListings)
      return
    }

    if (!searchQuery.trim()) {
      setFilteredListings(activeListings)
    } else {
      const filtered = activeListings.filter((listing) =>
        listing.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredListings(filtered)
    }
  }, [searchQuery, listings, userRole])

  const formatPrice = (price, isFree) => {
    if (isFree || price === 'Free') return 'Free'
    if (!price) return 'Price not specified'
    const numPrice = parseFloat(price)
    if (isNaN(numPrice)) return 'Free'
    return `₱${numPrice.toLocaleString()}`
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatLocationValue = (location, address, city) => {
    // If location is already a simple string, use it directly
    if (typeof location === 'string' && location.trim()) {
      return location.trim()
    }

    // If location is an object (e.g., { accuracy, latitude, longitude, timestamp })
    if (location && typeof location === 'object') {
      const { latitude, longitude } = location

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        // Format to a short coordinate string
        return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      }
    }

    // Fallbacks
    if (address && typeof address === 'string') return address
    if (city && typeof city === 'string') return city

    return ''
  }

  const calculateDistanceKm = (fromLocation, toLocation) => {
    if (!fromLocation || !toLocation) return null

    const fromLat = typeof fromLocation.latitude === 'number' ? fromLocation.latitude : null
    const fromLng = typeof fromLocation.longitude === 'number' ? fromLocation.longitude : null
    const toLat = typeof toLocation.latitude === 'number' ? toLocation.latitude : null
    const toLng = typeof toLocation.longitude === 'number' ? toLocation.longitude : null

    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null

    const toRad = (value) => (value * Math.PI) / 180

    const R = 6371
    const dLat = toRad(toLat - fromLat)
    const dLon = toRad(toLng - fromLng)
    const lat1 = toRad(fromLat)
    const lat2 = toRad(toLat)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance
  }

  const formatDistanceKm = (distanceKm) => {
    if (distanceKm == null) return ''
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m away`
    }
    return `${distanceKm.toFixed(1)} km away`
  }

  const limitWords = (text, wordLimit) => {
    if (!text) return ''
    const words = text.trim().split(/\s+/)
    if (words.length <= wordLimit) return text
    return words.slice(0, wordLimit).join(' ') + '...'
  }

  const getRoleDisplayTitle = () => {
    if (userRole === 'livestock_owner') {
      return 'My Listings'
    } else if (userRole === 'crop_farmer') {
      return 'Available Listings'
    }
    return 'Listings'
  }

  // Render listing card content
  const renderListingCard = (listing) => (
    <>
      {/* Image Container */}
      <div className={styles.imageContainer}>
        {(() => {
          const imageUrl = listing.images?.[0] || listing.imageUrls?.[0] || listing.imageUrl || listing.image || listing.photo || listing.photoUrl || listing.photos?.[0]
          return imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt={listing.name || listing.title || 'Listing'}
                className={styles.listingImage}
                onClick={() => openImageModal(imageUrl, listing.name || listing.title || 'Listing')}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
                <p>Failed to load image</p>
              </div>
              
              {/* AI Verification Badge */}
              {listing.isAiVerified && (
                <div className={styles.verifiedBadge}>
                  <span className={styles.verifiedText}>Verified by AI</span>
                </div>
              )}
            </>
          ) : (
            <div className={styles.imagePlaceholder}>
              <p>No image available</p>
            </div>
          )
        })()}
      </div>

      {/* Card Content */}
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.listingName}>
            {truncateTitle(listing.name || listing.title || listing.productName)}
          </h3>
          <div className={styles.price}>
            {formatPrice(listing.price || listing.cost || listing.amount, listing.isFree)}
          </div>
        </div>
        
        <p className={styles.ownerName}>
          by {listing.ownerName || listing.userName || listing.author || listing.seller || 'Unknown Owner'}
          <span className={styles.ownerRating}>
            ⭐ {typeof listing.ownerRating === 'number' ? listing.ownerRating.toFixed(1) : '0.0'}
          </span>
        </p>
        
        {(listing.description || listing.details || listing.info) && (
          <p className={styles.details}>
            {listing.description || listing.details || listing.info}
          </p>
        )}
        
        {(listing.category || listing.type || listing.breed) && (
          <div className={styles.measurements}>
            {listing.category || listing.type || listing.breed}
          </div>
        )}
        
        <div className={styles.listingMeta}>
          <span className={styles.listingDate}>
            Posted {formatDate(listing.createdAt || listing.timestamp || listing.dateCreated)}
          </span>
          {userRole === 'crop_farmer' && listing.distanceKm != null && (
            <span className={styles.listingLocation}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={listing.distanceKm < 5 ? "#2d5a27" : "#fa9100"} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span style={{ color: listing.distanceKm < 5 ? '#2d5a27' : '#fa9100', fontWeight: listing.distanceKm < 5 ? '600' : 'normal' }}>
                {listing.distanceKm < 5 ? 'Nearby' : `${listing.distanceKm.toFixed(1)} km away`}
              </span>
            </span>
          )}
        </div>
        
        <div className={styles.cardActions}>
          {userRole === 'crop_farmer' ? (
            (() => {
              const buttonState = getButtonState(listing.id)
              return (
                <button 
                  className={`${styles.requestButton} ${
                    requestStatuses[listing.id] === 'pending' ? styles.cancelRequestButton : 
                    requestStatuses[listing.id] === 'approved' ? styles.approvedButton : ''
                  }`}
                  disabled={buttonState.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (requestStatuses[listing.id] === 'pending') {
                      handleCancelRequest(listing.id).catch((error) => {
                        console.error('Main cancel failed, trying simplified version:', error)
                        handleCancelRequestSimple(listing.id)
                      })
                    } else if (!requestStatuses[listing.id] || requestStatuses[listing.id] === 'rejected' || requestStatuses[listing.id] === 'cancelled') {
                      handleListingRequest(listing)
                    }
                  }}
                >
                  {buttonState.text}
                </button>
              )
            })()
          ) : userRole === 'livestock_owner' ? (
            <>
              <button 
                className={styles.editButton}
                onClick={(e) => {
                  e.stopPropagation()
                  openEditModal(listing)
                }}
              >
                Edit
              </button>
              <button 
                className={styles.markSoldButton}
                onClick={(e) => {
                  e.stopPropagation()
                  markAsSold(listing)
                }}
              >
                Sold
              </button>
              <button 
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteListing(listing)
                }}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
  )

  if (authLoading || !user) {
    return null
  }


  if (loading) {
    return (
      <div className={styles.container}>
        {/* Header Container */}
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{getRoleDisplayTitle()}</h1>
          </div>
          
          <div className={styles.headerRight}>
            {/* Search Bar for Crop Farmers - Always Visible */}
            {userRole === 'crop_farmer' && (
              <div className={styles.searchContainer}>
                <div className={styles.searchInputWrapper}>
                  <img src="/assets/icons/search.png" alt="Search" className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search marketplace... (Press Enter)"
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchKeyPress}
                    className={styles.searchInput}
                    disabled
                  />
                </div>
              </div>
            )}
            
            {/* Buttons for Livestock Owners */}
            {userRole === 'livestock_owner' && (
              <div className={styles.ownerButtons}>
                <button 
                  className={styles.addListingButton}
                  disabled
                >
                  + Add Listings
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Loading Content */}
        <div className={styles.emptyState}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Listings</h1>
        </div>
        <div className={styles.loading}>
          <p style={{color: 'red'}}>Error: {error}</p>
          <button onClick={() => window.location.reload()} style={{marginTop: '10px', padding: '8px 16px', cursor: 'pointer'}}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Loading Overlay for Creating Listing - REMOVED DUPLICATE */}
      
      {/* Header Container */}
      <div className={styles.headerContainer}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{getRoleDisplayTitle()}</h1>
        </div>
        
        <div className={styles.headerRight}>
          {/* Search Bar for Crop Farmers */}
          {userRole === 'crop_farmer' && (
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <img src="/assets/icons/search.png" alt="Search" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search marketplace... (Press Enter)"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  onFocus={() => setShowRecentSearches(true)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button onClick={clearSearch} className={styles.clearSearchButton}>
                    ×
                  </button>
                )}
              </div>
              
              {/* Recent Searches Dropdown */}
              {showRecentSearches && recentSearches.length > 0 && (
                <div className={styles.recentSearchesDropdown}>
                  <div className={styles.recentSearchesHeader}>
                    <span>Recent Searches</span>
                    <button onClick={clearRecentSearches} className={styles.clearAllButton}>
                      Clear All
                    </button>
                  </div>
                  <div className={styles.recentSearchesList}>
                    {recentSearches.map((search, index) => (
                      <div
                        key={index}
                        className={styles.recentSearchItem}
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        <img src="/assets/icons/search.png" alt="Search" className={styles.recentSearchIcon} />
                        <span>{search}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Buttons for Livestock Owners */}
          {userRole === 'livestock_owner' && (
            <div className={styles.ownerButtons}>
              <button 
                className={styles.addListingButton}
                onClick={openAddModal}
              >
                + Add Listings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Listings Content */}
      <div className={styles.listingsContent}>
        {/* Location Disabled Notification for Crop Farmers */}
        {userRole === 'crop_farmer' && !userLocation && (
          <div className={styles.locationNotification}>
            <img src="/assets/icons/location.png" alt="Location" className={styles.notificationIcon} />
            <div className={styles.notificationContent}>
              <strong>Your location is disabled.</strong>
              <span>Enable your location to see nearby listings and get personalized recommendations.</span>
            </div>
            <button 
              onClick={() => window.location.href = '/account-settings'}
              className={styles.enableLocationButton}
            >
              Enable Location
            </button>
          </div>
        )}
        {/* Search Results Section */}
        {searchQuery && userRole === 'crop_farmer' ? (
          <>
            {/* Search Results Header */}
            <div className={styles.searchResultsHeader}>
              <h3 className={styles.sectionTitle}>
                Search Results for "{searchQuery}"
              </h3>
              <p className={styles.searchResultsCount}>
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
              </p>
            </div>

            {/* Matching Search Results */}
            {searchResults.length > 0 ? (
              <div className={styles.searchSection}>
                <div className={styles.listingsGrid}>
                  {searchResults.map((listing) => (
                    <div 
                      key={listing.id} 
                      className={styles.listingCard}
                      onClick={() => openDetailsModal(listing)}
                      style={{ cursor: 'pointer' }}
                    >
                      {renderListingCard(listing)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.noSearchResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <h4>No matching listings found</h4>
                <p>We couldn't find any listings matching "{searchQuery}"</p>
              </div>
            )}

            {/* Other Listings You May Like - Always show if available */}
            {outsideSearchResults.length > 0 && (
              <div className={styles.searchSection}>
                <h3 className={styles.sectionTitle}>
                  Other Listings You May Like
                </h3>
                <div className={styles.listingsGrid}>
                  {outsideSearchResults.map((listing) => (
                    <div 
                      key={listing.id} 
                      className={styles.listingCard}
                      onClick={() => openDetailsModal(listing)}
                      style={{ cursor: 'pointer' }}
                    >
                      {renderListingCard(listing)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Regular Listings Display */
          filteredListings.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No listings found</h3>
              <p>
                {userRole === 'livestock_owner' ?
                  'You haven\'t created any listings yet. Click "Add Listing" to get started!' :
                  'No listings available at the moment. Check back later for new listings.'
                }
              </p>
            </div>
          ) : (
            <div className={styles.listingsGrid}>
              {filteredListings.map((listing) => (
                <div 
                  key={listing.id} 
                  className={styles.listingCard}
                  onClick={() => openDetailsModal(listing)}
                  style={{ cursor: 'pointer' }}
                >
                  {renderListingCard(listing)}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Add Listing Modal - Multi-Step - Using Portal to render at document body level */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingListing ? 'Edit Listing' : 'New Listing'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalLayout}>
                {/* Left Side - Vertical Step Indicator */}
                <div className={styles.stepSidebar}>
                  <div className={styles.verticalSteps}>
                    <div className={`${styles.verticalStep} ${modalStep >= 1 ? styles.active : ''} ${modalStep > 1 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>1</div>
                      <div className={styles.stepLabel}>Basic Info</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 2 ? styles.active : ''} ${modalStep > 2 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>2</div>
                      <div className={styles.stepLabel}>Measurements</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 3 ? styles.active : ''} ${modalStep > 3 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>3</div>
                      <div className={styles.stepLabel}>Pricing</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 4 ? styles.active : ''} ${modalStep > 4 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>4</div>
                      <div className={styles.stepLabel}>Image</div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Step Content */}
                <div className={styles.contentArea}>
              {/* Step 1: Basic Information */}
              {modalStep === 1 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Basic Information</h3>
                  <div className={styles.formGroup}>
                    <label>Listing Title *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., Cattle Manure, Compost, Chicken Manure"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Listing Description *</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Describe your product: nutrient content, condition, storage method, etc."
                      value={formData.details}
                      onChange={(e) => setFormData({...formData, details: e.target.value})}
                      rows={5}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Measurements & Quantity */}
              {modalStep === 2 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Measurements & Quantity</h3>
                  <div className={styles.formGroup}>
                    <label>Quantity *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={styles.input}
                      placeholder="e.g., 50, 100, 500"
                      value={formData.measurements}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setFormData({...formData, measurements: value})
                      }}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Unit of Measurement *</label>
                    <div className={styles.measurementButtons}>
                      {measurementUnits.map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          className={`${styles.measurementButton} ${formData.measurementUnit === unit ? styles.active : ''}`}
                          onClick={() => setFormData({...formData, measurementUnit: unit})}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Pricing */}
              {modalStep === 3 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Pricing</h3>
                  <div className={styles.formGroup}>
                    <label>Set Price</label>
                    <div className={styles.pricingOptions}>
                      <button
                        type="button"
                        className={`${styles.freeButton} ${formData.isFree ? styles.active : ''}`}
                        onClick={() => setFormData({...formData, isFree: true, price: ''})}
                      >
                        Free
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Price (₱) {!formData.isFree && '*'}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={styles.input}
                      placeholder="Enter price in Philippine Peso"
                      value={formData.price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setFormData({...formData, price: value})
                      }}
                      onFocus={() => setFormData({...formData, isFree: false})}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Image */}
              {modalStep === 4 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Add Image</h3>
                  
                  {/* AI Verification Info Box */}
                  {userRole === 'livestock_owner' && (
                    <div className={styles.verificationInfoBox}>
                      <div className={styles.infoIcon}>ℹ️</div>
                      <div className={styles.infoText}>
                        <strong>AI Image Verification (Optional)</strong>
                        <p>Your image will be verified by AI to confirm it contains legitimate livestock waste or processed fertilizer. You can still create your listing even if verification fails or if the image isn't recognized as livestock waste.</p>
                        <p><strong>Note:</strong> If the listing is not verified by AI, the listing might be reported for non-agricultural content.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label>Product Image *</label>
                    {formData.imagePreview ? (
                      <>
                        <div className={styles.imagePreview}>
                          <img src={formData.imagePreview} alt="Preview" />
                          
                          <button 
                            className={styles.removeImageButton}
                            onClick={() => {
                              // Revoke the blob URL to prevent memory leaks
                              if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
                                URL.revokeObjectURL(formData.imagePreview)
                              }
                              setFormData({...formData, image: null, imagePreview: null})
                              setIsImageValidating(false)
                              setImageValidationResult(null)
                              setIsImageVerified(false)
                              setValidatedImageUrl(null)
                            }}
                          >
                            ×
                          </button>
                        </div>
                        
                        {/* AI Validation Status - Moved outside image preview */}
                        {userRole === 'livestock_owner' && (
                          <div className={styles.validationStatus}>
                            {isImageValidating ? (
                              <div className={styles.validating}>
                                <div className={styles.validationSpinner}></div>
                                <span>AI is verifying your image...</span>
                              </div>
                            ) : imageValidationResult ? (
                              <div className={`${styles.verificationResult} ${
                                imageValidationResult.verdict === 'VERIFIED_LEGITIMATE' ? styles.verifiedLegitimate :
                                imageValidationResult.verdict === 'VERIFIED_NOT_LEGITIMATE' ? styles.verifiedNotLegitimate :
                                styles.unableToVerify
                              }`}>
                                <div className={styles.verificationIcon}>
                                  {imageValidationResult.verdict === 'VERIFIED_LEGITIMATE' ? '✅' :
                                   imageValidationResult.verdict === 'VERIFIED_NOT_LEGITIMATE' ? 'ℹ️' : '⚠️'}
                                </div>
                                <div className={styles.verificationText}>
                                  <strong>
                                    {imageValidationResult.verdict === 'VERIFIED_LEGITIMATE' ? 'Verified by AI - Legitimate Livestock Waste' :
                                     imageValidationResult.verdict === 'VERIFIED_NOT_LEGITIMATE' ? 'Verified by AI - Not Livestock Waste' :
                                     'Unable to Verify'}
                                  </strong>
                                  <p>{imageValidationResult.reason}</p>
                                  <button 
                                    className={styles.revalidateButton}
                                    onClick={revalidateImage}
                                    disabled={isImageValidating}
                                  >
                                    {isImageValidating ? 'Re-validating...' : 'Re-validate Image'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.imageUploadContainer}>
                        <input
                          type="file"
                          accept="image/*"
                          className={styles.fileInput}
                          id="imageUpload"
                          onChange={async (e) => {
                            const file = e.target.files[0]
                            if (file) {
                              // Create blob URL for preview
                              const imagePreview = URL.createObjectURL(file)
                              setFormData({...formData, image: file, imagePreview})
                              
                              // Trigger AI validation if user is livestock owner
                              if (userRole === 'livestock_owner' && formData.name && formData.details) {
                                await validateImageWithAI(file, formData.name, formData.details)
                              }
                            }
                          }}
                        />
                        <label htmlFor="imageUpload" className={styles.uploadLabel}>
                          <div className={styles.uploadText}>
                            <span className={styles.uploadTitle}>Click to upload image</span>
                            <span className={styles.uploadSubtitle}>PNG, JPG up to 10MB</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton} 
                onClick={modalStep === 1 ? closeModal : prevStep}
              >
                {modalStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {modalStep < 4 ? (
                <button className={styles.nextButton} onClick={nextStep} disabled={!isCurrentStepValid()}>
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.nextButton} ${styles.createButton}`}
                  onClick={saveListing}
                  disabled={isCreatingListing || isImageValidating || !areAllStepsCompleted()}
                >
                  {isCreatingListing ? 'Creating...' : isImageValidating ? 'Validating Image...' : 'Create Listing'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Creating Listing */}
      {isCreatingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Processing...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Requesting Listing */}
      {isRequestingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Requesting...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Deleting Listing */}
      {isDeletingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Deleting listing...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Listing Details Modal - Using Portal to render at document body level */}
      {showDetailsModal && selectedListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={closeDetailsModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <div className={styles.headerTitleRow}>
                  <h2>{selectedListing.name || 'Unnamed Listing'}</h2>
                  <span className={styles.headerPrice}>
                    {formatPrice(selectedListing.price, selectedListing.isFree)}
                  </span>
                </div>
                <span className={styles.headerDate}>
                  {formatDate(selectedListing.createdAt || selectedListing.timestamp)}
                </span>
              </div>
              <button className={styles.closeButton} onClick={closeDetailsModal}>
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.detailsLayout}>
                {/* Left Column - Image */}
                <div className={styles.detailsLeft}>
                  {(() => {
                    const imageUrl = selectedListing.images?.[0] || selectedListing.imageUrls?.[0] || selectedListing.imageUrl || selectedListing.image || selectedListing.photo || selectedListing.photoUrl || selectedListing.photos?.[0]
                    return imageUrl ? (
                      <div className={styles.detailsImageContainer}>
                        <img 
                          src={imageUrl} 
                          alt={selectedListing.name}
                          className={styles.detailsImage}
                          onClick={() => openImageModal(imageUrl, selectedListing.name)}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                        <div className={styles.detailsPlaceholder} style={{ display: 'none' }}>
                          <p>Failed to load image</p>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.detailsPlaceholder}>
                        <p>No image available</p>
                      </div>
                    )
                  })()}
                </div>
                
                {/* Right Column - Details */}
                <div className={styles.detailsRight}>
                  {/* Owner Info */}
                  <div className={styles.detailsSection}>
                    <p className={styles.detailsOwner}>
                      by {selectedListing.ownerName || 'Unknown Owner'}
                      <span className={styles.detailsRating}>
                        ⭐ {typeof selectedListing.ownerRating === 'number' ? selectedListing.ownerRating.toFixed(1) : '0.0'}
                      </span>
                    </p>
                  </div>
                  
                  {/* Description */}
                  {selectedListing.details && (
                    <div className={styles.detailsSection}>
                      <h4>Description</h4>
                      <p className={styles.detailsDescription}>{selectedListing.details}</p>
                    </div>
                  )}
                  
                  {/* Quantity and Distance/Location */}
                  <div className={styles.detailsRow}>
                    {selectedListing.measurements && (
                      <div className={styles.detailsSection}>
                        <h4>Quantity</h4>
                        <p>{selectedListing.measurements} {selectedListing.measurementUnit || 'units'}</p>
                      </div>
                    )}
                    
                    {userRole === 'crop_farmer' && selectedListing.distanceKm != null && (
                      <div className={styles.detailsSection}>
                        <h4>Distance</h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedListing.distanceKm < 5 ? "#2d5a27" : "#fa9100"} xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span style={{ color: selectedListing.distanceKm < 5 ? '#2d5a27' : '#fa9100', fontWeight: '600' }}>
                            {selectedListing.distanceKm < 5 ? 'Nearby' : `${selectedListing.distanceKm.toFixed(1)} km away`}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              {userRole === 'crop_farmer' ? (
                (() => {
                  const buttonState = getButtonState(selectedListing?.id)
                  return (
                    <div className={styles.cropFarmerActions}>
                      <button 
                        className={`${styles.requestButton} ${
                          requestStatuses[selectedListing?.id] === 'pending' ? styles.cancelButton : 
                          requestStatuses[selectedListing?.id] === 'approved' ? styles.approvedButton : ''
                        }`}
                        disabled={buttonState.disabled}
                        onClick={() => {
                          if (requestStatuses[selectedListing?.id] === 'pending') {
                            // Try main cancel function first, with fallback to simplified version
                            handleCancelRequest(selectedListing?.id).catch((error) => {
                              console.error('Main cancel failed, trying simplified version:', error)
                              handleCancelRequestSimple(selectedListing?.id)
                            }).finally(() => {
                              closeDetailsModal()
                            })
                          } else if (!requestStatuses[selectedListing?.id] || requestStatuses[selectedListing?.id] === 'rejected' || requestStatuses[selectedListing?.id] === 'cancelled') {
                            handleListingRequest(selectedListing)
                            closeDetailsModal()
                          } else {
                            closeDetailsModal()
                          }
                        }}
                      >
                        {buttonState.text}
                      </button>
                      <button 
                        className={styles.reportListingButton}
                        onClick={() => {
                          closeDetailsModal()
                          handleReportListing(selectedListing)
                        }}
                        title="Report this listing"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 9v4M12 17h.01M5.07 19H19a2 2 0 001.75-2.96l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005.07 19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Report
                      </button>
                    </div>
                  )
                })()
              ) : userRole === 'livestock_owner' ? (
                <div className={styles.ownerActions}>
                  <button 
                    className={styles.editButton}
                    onClick={() => {
                      closeDetailsModal()
                      openEditModal(selectedListing)
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className={styles.deleteButton}
                    onClick={() => {
                      closeDetailsModal()
                      deleteListing(selectedListing)
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        targetUser={{
          id: reportedListing?.ownerId,
          displayName: reportedListing?.ownerName,
          firstName: reportedListing?.ownerName?.split(' ')[0],
          lastName: reportedListing?.ownerName?.split(' ').slice(1).join(' ')
        }}
        content={{
          id: reportedListing?.id,
          name: reportedListing?.name,
          caption: reportedListing?.name,
          details: reportedListing?.details || reportedListing?.description,
          description: reportedListing?.details || reportedListing?.description,
          text: reportedListing?.details || reportedListing?.description,
          content: `${reportedListing?.name || ''} - ${reportedListing?.details || reportedListing?.description || ''}`,
          // Primary field is 'image' (singular) based on how listings are saved
          imageUrl: reportedListing?.image || reportedListing?.images?.[0] || reportedListing?.imageUrls?.[0] || reportedListing?.imageUrl || '',
          imageUrls: reportedListing?.image ? [reportedListing.image] : (reportedListing?.images || reportedListing?.imageUrls || []),
          mediaUrl: reportedListing?.image || reportedListing?.images?.[0] || reportedListing?.imageUrls?.[0] || reportedListing?.imageUrl || ''
        }}
        contentType="listing"
        reporterId={user?.uid}
      />

      {/* Image Modal */}
      {showImageModal && createPortal(
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.imageModalClose} onClick={closeImageModal}>
              ×
            </button>
            <img 
              src={selectedImage} 
              alt={selectedImageAlt}
              className={styles.imageModalImage}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}