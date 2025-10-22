import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import styles from '../../styles/modules/listings.module.css'

export default function Listings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredListings, setFilteredListings] = useState([])
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    measurements: '',
    measurementUnit: 'kg',
    price: '',
    isFree: false,
    image: null
  })
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [listingRequests, setListingRequests] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [requestMessages, setRequestMessages] = useState({})
  const [requestStatuses, setRequestStatuses] = useState({})

  const measurementUnits = ['kg', 'ton', 'sack', 'bag', 'liter', 'cubic meter', 'pieces', 'bundle']

  // Function to truncate title to 20 characters
  const truncateTitle = (title, maxLength = 20) => {
    if (!title) return 'Unnamed Listing'
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

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
      image: null
    })
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingListing(null)
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null
    })
  }

  const openEditModal = (listing) => {
    setFormData({
      name: listing.name || '',
      details: listing.details || '',
      measurements: listing.measurements || '',
      measurementUnit: listing.measurementUnit || 'kg',
      price: listing.isFree ? '' : (listing.price === 'Free' ? '' : listing.price || ''),
      isFree: listing.isFree || listing.price === 'Free',
      image: listing.image || null
    })
    setEditingListing(listing)
    setShowAddModal(true)
  }

  const deleteListing = async (listing) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteDoc(doc(db, 'livestock_listings', listing.id))
        alert('Listing deleted successfully')
      } catch (error) {
        console.error('Error deleting listing:', error)
        alert('Failed to delete listing')
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
    // Restore background scrolling
    document.body.style.overflow = 'unset'
  }

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showDetailsModal) {
          closeDetailsModal()
        }
        if (showAddModal) {
          closeModal()
        }
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showDetailsModal, showAddModal])

  const saveListing = async () => {
    console.log('🚀 saveListing called with formData:', formData)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email, role: userRole })
    console.log('🔥 Database initialized:', !!db)

    if (!formData.name.trim()) {
      alert('Please enter a product name')
      return
    }

    if (!formData.isFree && !formData.price.trim()) {
      alert('Please enter a price or mark as free')
      return
    }

    if (!user) {
      alert('User not authenticated. Please sign in again.')
      return
    }

    if (!db) {
      alert('Database not initialized. Please refresh the page.')
      return
    }

    try {
      const listingData = {
        name: formData.name.trim(),
        details: formData.details.trim(),
        measurements: formData.measurements.trim(),
        measurementUnit: formData.measurementUnit,
        price: formData.isFree ? 'Free' : formData.price.trim(),
        isFree: formData.isFree,
        image: formData.image,
        ownerId: user.uid,
        ownerName: user.displayName || user.email || 'Livestock Owner',
        ownerEmail: user.email || '',
        updatedAt: serverTimestamp()
      }

      console.log('📝 Listing data to save:', listingData)

      if (editingListing) {
        // Update existing listing
        console.log('🔄 Updating existing listing:', editingListing.id)
        await updateDoc(doc(db, 'livestock_listings', editingListing.id), listingData)
        console.log('✅ Listing updated successfully')
        alert('Listing updated successfully')
      } else {
        // Create new listing
        listingData.createdAt = serverTimestamp()
        console.log('🆕 Creating new listing...')
        const docRef = await addDoc(collection(db, 'livestock_listings'), listingData)
        console.log('✅ New listing created with ID:', docRef.id)
        alert('Listing created successfully')
      }
      
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
      
      alert(errorMessage)
    }
  }

  // Handle request approval by listing owner
  const handleApproveRequest = async (requestId, requestData) => {
    if (!user || !requestData) return

    console.log('✅ Approving request:', requestId)
    
    try {
      // Update request status to approved
      await updateDoc(doc(db, 'listing_requests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      })

      // Update chat status to approved
      const participants = [requestData.requesterId, requestData.listingOwnerId].sort()
      const chatId = participants.join('_')
      const chatRef = doc(db, 'chats', chatId)
      
      // Update chat status
      await updateDoc(chatRef, {
        requestStatus: 'approved',
        approvedAt: serverTimestamp(),
        lastMessage: `Request approved for listing: ${requestData.listingName}`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      })
      
      // Send approval message
      const messageData = {
        text: `I have approved your request for "${requestData.listingName}". You can now chat with me about the details.`,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Livestock Owner',
        createdAt: serverTimestamp(),
        read: false,
        type: 'request_approval'
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      // Send notification to requester
      const approvalNotificationData = {
        recipientId: requestData.requesterId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Livestock Owner',
        type: 'request_approved',
        title: 'Request Approved',
        message: `Your request for "${requestData.listingName}" has been approved! You can now chat with the owner.`,
        listingId: requestData.listingId,
        listingName: requestData.listingName,
        requestId: requestId,
        read: false,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'notifications'), approvalNotificationData)
      
      alert('Request approved successfully! Chat has been enabled.')
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request. Please try again.')
    }
  }

  // Handle request rejection by listing owner
  const handleRejectRequest = async (requestId, requestData) => {
    if (!user || !requestData) return

    console.log('❌ Rejecting request:', requestId)
    
    try {
      // Update request status to rejected
      await updateDoc(doc(db, 'listing_requests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      })

      // Update chat status to rejected
      const participants = [requestData.requesterId, requestData.listingOwnerId].sort()
      const chatId = participants.join('_')
      const chatRef = doc(db, 'chats', chatId)
      
      await updateDoc(chatRef, {
        requestStatus: 'rejected',
        rejectedAt: serverTimestamp(),
        lastMessage: `Request declined for listing: ${requestData.listingName}`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      })
      
      // Send rejection message
      const messageData = {
        text: `I have declined your request for "${requestData.listingName}". Thank you for your interest.`,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Livestock Owner',
        createdAt: serverTimestamp(),
        read: false,
        type: 'request_rejection'
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      // Send notification to requester
      const rejectionNotificationData = {
        recipientId: requestData.requesterId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Livestock Owner',
        type: 'request_rejected',
        title: 'Request Declined',
        message: `Your request for "${requestData.listingName}" has been declined.`,
        listingId: requestData.listingId,
        listingName: requestData.listingName,
        requestId: requestId,
        read: false,
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'notifications'), rejectionNotificationData)
      
      alert('Request declined.')
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to decline request. Please try again.')
    }
  }

  // Handle cancel request
  const handleCancelRequest = async (listingId) => {
    console.log('🚀 handleCancelRequest called for listing:', listingId)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email })
    console.log('🔥 Database initialized:', !!db)

    if (!user) {
      console.error('❌ No user authenticated')
      alert('Please sign in to cancel requests.')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      alert('Database connection error. Please refresh the page.')
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
        const chatId = participants.join('_')
        const chatRef = doc(db, 'chats', chatId)
        
        console.log('📝 Chat details:', {
          participants: participants,
          chatId: chatId
        })
        
        try {
          // Update chat status to cancelled
          await updateDoc(chatRef, {
            requestStatus: 'cancelled',
            cancelledAt: serverTimestamp(),
            lastMessage: `Request cancelled for listing: ${requestData.listingName}`,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: user.uid
          })
          console.log('✅ Chat status updated to cancelled')
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

          // Add message to the chat
          await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
          console.log('✅ Cancellation message sent to chat')
        } catch (messageError) {
          console.error('❌ Failed to send cancellation message:', messageError)
          // Continue with cancellation even if message fails
        }

        console.log('🗑️ Step 3: Deleting request from database...')
        
        // Delete the request
        await deleteDoc(requestDoc.ref)
        console.log('✅ Request document deleted successfully')
        
        // The onSnapshot listener will automatically update requestedListings
        // when the document is deleted from the database
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
        
        alert('Request cancelled successfully and owner has been notified')
      } else {
        console.error('❌ No request found to cancel')
        console.log('🔍 Debugging info:', {
          userUid: user.uid,
          listingId: listingId,
          queryCollection: 'listing_requests'
        })
        alert('No active request found for this listing. It may have already been cancelled or processed.')
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
      
      alert(errorMessage)
    }
  }

  // Load messages for a specific request
  const loadRequestMessages = async (requestData) => {
    if (!requestData.requesterId || !requestData.listingOwnerId) {
      console.log('⚠️ Missing participant IDs for request:', requestData.id)
      return
    }

    try {
      const participants = [requestData.requesterId, requestData.listingOwnerId].sort()
      const chatId = participants.join('_')
      
      console.log('📨 Loading messages for request:', {
        requestId: requestData.id,
        chatId: chatId,
        participants: participants
      })
      
      // Try with requestId filter first
      let messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('requestId', '==', requestData.id)
      )
      
      let messagesSnapshot = await getDocs(messagesQuery)
      
      // If no messages found with requestId, try with isListingRequest and listingId
      if (messagesSnapshot.empty) {
        console.log('🔍 No messages found with requestId, trying with listingId...')
        messagesQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          where('isListingRequest', '==', true),
          where('listingId', '==', requestData.listingId)
        )
        messagesSnapshot = await getDocs(messagesQuery)
      }
      
      // If still no messages, get all messages from this chat
      if (messagesSnapshot.empty) {
        console.log('🔍 No messages found with filters, getting all chat messages...')
        messagesQuery = collection(db, 'chats', chatId, 'messages')
        messagesSnapshot = await getDocs(messagesQuery)
      }
      
      const messages = []
      messagesSnapshot.forEach((doc) => {
        const messageData = doc.data()
        messages.push({
          id: doc.id,
          ...messageData
        })
      })
      
      // Sort messages by createdAt
      messages.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return aTime - bTime
      })
      
      setRequestMessages(prev => ({
        ...prev,
        [requestData.id]: messages
      }))
      
      console.log('📨 Loaded messages for request:', requestData.id, 'Messages:', messages.length)
      if (messages.length > 0) {
        console.log('📝 First message:', messages[0].text)
      }
    } catch (error) {
      console.error('❌ Error loading request messages:', error)
    }
  }

  // Simplified cancel request function (fallback)
  const handleCancelRequestSimple = async (listingId) => {
    console.log('🔄 Using simplified cancel request for listing:', listingId)
    
    if (!user || !db) {
      alert('Please sign in and refresh the page.')
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
        await deleteDoc(requestDoc.ref)
        
        // Force immediate state update
        setRequestedListings(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
        
        console.log('✅ Simplified cancellation successful')
        alert('Request cancelled successfully!')
      } else {
        alert('No active request found for this listing.')
      }
    } catch (error) {
      console.error('❌ Simplified cancellation failed:', error)
      alert('Failed to cancel request. Please try again.')
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
      alert('Please sign in to send requests.')
      return
    }

    if (!listing) {
      console.error('❌ No listing provided')
      alert('Invalid listing. Please try again.')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      alert('Database connection error. Please refresh the page and try again.')
      return
    }

    // Validate required listing fields
    if (!listing.id) {
      console.error('❌ Listing missing ID:', listing)
      alert('Invalid listing data. Please refresh the page and try again.')
      return
    }

    if (!listing.ownerId) {
      console.error('❌ Listing missing owner ID:', listing)
      alert('Unable to identify listing owner. Please try again.')
      return
    }

    if (listing.ownerId === user.uid) {
      alert('You cannot request your own listing.')
      return
    }

    // Check if already requested
    if (requestedListings.has(listing.id)) {
      alert('You have already requested this listing.')
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
      const chatId = participants.join('_')
      const chatRef = doc(db, 'chats', chatId)
      
      try {
        // Check if chat exists
        const chatDoc = await getDoc(chatRef)
        
        if (!chatDoc.exists()) {
          // Create new chat
          const chatData = {
            participants: participants,
            participantNames: {
              [user.uid]: user.displayName || user.email || 'Crop Farmer',
              [listing.ownerId]: listing.ownerName
            },
            participantEmails: {
              [user.uid]: user.email || '',
              [listing.ownerId]: listing.ownerEmail || ''
            },
            createdAt: serverTimestamp(),
            lastMessage: `I am interested in your listing: ${listing.name || listing.title}`,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: user.uid,
            requestStatus: 'pending', // Add request status to chat
            requestId: docRef.id
          }
          
          await setDoc(chatRef, chatData)
          console.log('✅ Chat created')
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
          requestStatus: 'pending',
          requestId: docRef.id
        }

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
        recipientId: listing.ownerId,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Crop Farmer',
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
        await addDoc(collection(db, 'notifications'), notificationData)
        console.log('✅ Notification sent to listing owner')
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
      
      console.log('🎉 Request process completed successfully for listing:', listing.id)
      alert('Request sent successfully! The listing owner will be notified and can approve your request.')
    } catch (error) {
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
          const chatId = participants.join('_')
          const chatRef = doc(db, 'chats', chatId)
          
          // Check if chat exists
          const chatDoc = await getDoc(chatRef)
          
          if (!chatDoc.exists()) {
            // Create new chat
            const chatData = {
              participants: participants,
              participantNames: {
                [user.uid]: user.displayName || user.email || 'Crop Farmer',
                [listing.ownerId]: listing.ownerName
              },
              participantEmails: {
                [user.uid]: user.email || '',
                [listing.ownerId]: listing.ownerEmail || ''
              },
              createdAt: serverTimestamp(),
              lastMessage: `I am interested in your listing: ${listing.name || listing.title}`,
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid,
              requestStatus: 'pending',
              requestId: fallbackDocRef.id
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
            recipientId: listing.ownerId,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Crop Farmer',
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
        alert('Request sent successfully! The listing owner will be notified.')
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
      
      alert(errorMessage)
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
          } else {
            setUserRole('crop_farmer')
          }
        } catch (error) {
          setError('Failed to load user role')
          setUserRole('crop_farmer') // Default fallback
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

  // Load pending requests for livestock owners
  useEffect(() => {
    if (!user || !db || userRole !== 'livestock_owner') return

    const q = query(
      collection(db, 'listing_requests'),
      where('listingOwnerId', '==', user.uid),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests = []
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        })
      })
      setPendingRequests(requests)
      console.log('📋 Pending requests loaded:', requests.length)
      
      // Load messages for each request
      for (const request of requests) {
        await loadRequestMessages(request)
      }
    }, (error) => {
      console.error('Error loading pending requests:', error)
    })

    return () => unsubscribe()
  }, [user, userRole])


  // Fetch listings from Firebase based on user role
  useEffect(() => {
    if (!db || authLoading || !user || !userRole) return

    setLoading(true)
    setError(null)

    const listingsRef = collection(db, 'livestock_listings')
    let q
    
    if (userRole === 'livestock_owner') {
      // Livestock owners see only their own listings
      q = query(listingsRef, where('ownerId', '==', user.uid))
    } else {
      // Crop farmers see all listings - no filters
      q = listingsRef
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Listings snapshot received:', {
        userRole,
        userId: user.uid,
        snapshotSize: snapshot.size,
        isEmpty: snapshot.empty
      })
      
      const listingsData = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('📋 Listing found:', {
          id: doc.id,
          name: data.name,
          ownerId: data.ownerId,
          ownerName: data.ownerName,
          createdAt: data.createdAt
        })
        listingsData.push({
          id: doc.id,
          ...data
        })
      })
      
      console.log('✅ Total listings loaded:', listingsData.length)
      setListings(listingsData)
      setFilteredListings(listingsData)
      setLoading(false)
    }, (error) => {
      console.error('❌ Error loading listings:', error)
      setError('Failed to load listings')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [db, user, userRole, authLoading])

  // Filter listings based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredListings(listings)
    } else {
      const filtered = listings.filter(listing => 
        listing.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredListings(filtered)
    }
  }, [searchQuery, listings])

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
        </div>
        
        {/* Loading Content */}
        <div className={styles.loadingContent}>
          <img 
            src="/assets/images/agrilink-logo.png" 
            alt="AgriLink" 
            className={styles.loadingLogo}
          />
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
                  placeholder="Search marketplace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          )}
          
          {/* Buttons for Livestock Owners */}
          {userRole === 'livestock_owner' && (
            <div className={styles.ownerButtons}>
              <button 
                className={`${styles.viewRequestsButton} ${pendingRequests.length > 0 ? styles.hasNotifications : ''}`}
                onClick={() => setShowRequestsModal(true)}
              >
                📋 Requests ({pendingRequests.length})
                {pendingRequests.length > 0 && <span className={styles.notificationBadge}>!</span>}
              </button>
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
        {filteredListings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3>No listings found</h3>
            <p>
              {searchQuery ? 
                `No listings match "${searchQuery}". Try a different search term.` :
                userRole === 'livestock_owner' ?
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
                {/* Image Container */}
                <div className={styles.imageContainer}>
                  {(() => {
                    // Try different possible image field names
                    const imageUrl = listing.images?.[0] || 
                                   listing.imageUrls?.[0] || 
                                   listing.imageUrl || 
                                   listing.image || 
                                   listing.photo || 
                                   listing.photoUrl ||
                                   listing.photos?.[0]
                    
                    return imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={listing.name || listing.title || 'Listing'}
                        className={styles.listingImage}
                        onError={(e) => {
                          console.log('Image failed to load:', imageUrl)
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null
                  })()}
                  <div className={styles.placeholderImage} style={{
                    display: (listing.images?.[0] || listing.imageUrls?.[0] || listing.imageUrl || listing.image || listing.photo || listing.photoUrl || listing.photos?.[0]) ? 'none' : 'flex'
                  }}>
                    <p>No image</p>
                  </div>
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
                    {(listing.location || listing.address || listing.city) && (
                      <span className={styles.listingLocation}>
                        📍 {listing.location || listing.address || listing.city}
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
                              requestStatuses[listing.id] === 'pending' ? styles.cancelButton : 
                              requestStatuses[listing.id] === 'approved' ? styles.approvedButton : ''
                            }`}
                            disabled={buttonState.disabled}
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('🔘 Button clicked for listing:', {
                                listingId: listing.id,
                                status: requestStatuses[listing.id],
                                buttonText: buttonState.text
                              })
                              
                              if (requestStatuses[listing.id] === 'pending') {
                                // Try main cancel function first, with fallback to simplified version
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Listing Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingListing ? 'Edit Listing' : 'New Listing'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g., Cattle Manure, Compost"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g., 50, 100"
                    value={formData.measurements}
                    onChange={(e) => setFormData({...formData, measurements: e.target.value})}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Unit of Measurement</label>
                  <select
                    className={styles.select}
                    value={formData.measurementUnit}
                    onChange={(e) => setFormData({...formData, measurementUnit: e.target.value})}
                  >
                    {measurementUnits.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Price</label>
                  <div className={styles.priceContainer}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData({...formData, isFree: e.target.checked})}
                      />
                      Free
                    </label>
                    
                    {!formData.isFree && (
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="Price (₱)"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Product Details</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Nutrient content, condition, storage method, etc."
                  value={formData.details}
                  onChange={(e) => setFormData({...formData, details: e.target.value})}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image (Optional)</label>
                {formData.image ? (
                  <div className={styles.imagePreview}>
                    <img src={formData.image} alt="Preview" />
                    <button 
                      className={styles.removeImageButton}
                      onClick={() => setFormData({...formData, image: null})}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className={styles.imageUpload}>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.fileInput}
                      id="imageUpload"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setFormData({...formData, image: event.target.result})
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <label htmlFor="imageUpload" className={styles.uploadLabel}>
                      📷 Add Photo
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={closeModal}>
                Cancel
              </button>
              <button className={styles.saveButton} onClick={saveListing}>
                {editingListing ? 'Update Listing' : 'Save Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listing Details Modal */}
      {showDetailsModal && selectedListing && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <h2>{selectedListing.name || 'Unnamed Listing'}</h2>
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
                  {selectedListing.image ? (
                    <div className={styles.detailsImageContainer}>
                      <img 
                        src={selectedListing.image} 
                        alt={selectedListing.name}
                        className={styles.detailsImage}
                      />
                    </div>
                  ) : (
                    <div className={styles.detailsPlaceholder}>
                      <p>No image available</p>
                    </div>
                  )}
                </div>
                
                {/* Right Column - Details */}
                <div className={styles.detailsRight}>
                  {/* Price and Owner */}
                  <div className={styles.detailsSection}>
                    <div className={styles.detailsPrice}>
                      {formatPrice(selectedListing.price, selectedListing.isFree)}
                    </div>
                    <p className={styles.detailsOwner}>
                      by {selectedListing.ownerName || 'Unknown Owner'}
                    </p>
                  </div>
                  
                  {/* Description */}
                  {selectedListing.details && (
                    <div className={styles.detailsSection}>
                      <h4>Description</h4>
                      <p className={styles.detailsDescription}>{selectedListing.details}</p>
                    </div>
                  )}
                  
                  {/* Quantity and Location */}
                  <div className={styles.detailsRow}>
                    {selectedListing.measurements && (
                      <div className={styles.detailsSection}>
                        <h4>Quantity</h4>
                        <p>{selectedListing.measurements} {selectedListing.measurementUnit || 'units'}</p>
                      </div>
                    )}
                    
                    {(selectedListing.location || selectedListing.address || selectedListing.city) && (
                      <div className={styles.detailsSection}>
                        <h4>Location</h4>
                        <p>📍 {selectedListing.location || selectedListing.address || selectedListing.city}</p>
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
        </div>
      )}

      {/* Requests Modal for Livestock Owners */}
      {showRequestsModal && userRole === 'livestock_owner' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Pending Requests ({pendingRequests.length})</h2>
              <button className={styles.closeButton} onClick={() => setShowRequestsModal(false)}>
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {pendingRequests.length === 0 ? (
                <div className={styles.emptyRequests}>
                  <p>No pending requests at the moment.</p>
                </div>
              ) : (
                <div className={styles.requestsList}>
                  {pendingRequests.map((request) => (
                    <div key={request.id} className={styles.requestItem}>
                      <div className={styles.requestInfo}>
                        <h4>{request.listingName}</h4>
                        <p><strong>From:</strong> {request.requesterName}</p>
                        <p><strong>Email:</strong> {request.requesterEmail}</p>
                        <p><strong>Requested:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                        
                        {/* Display messages from the crop farmer */}
                        {requestMessages[request.id] && requestMessages[request.id].length > 0 && (
                          <div className={styles.requestMessages}>
                            <p><strong>Message:</strong></p>
                            <div className={styles.messagesList}>
                              {requestMessages[request.id].map((message) => (
                                <div key={message.id} className={styles.messageItem}>
                                  <p className={styles.messageText}>"{message.text}"</p>
                                  <span className={styles.messageTime}>
                                    {message.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.requestActions}>
                        <button 
                          className={styles.approveButton}
                          onClick={() => {
                            handleApproveRequest(request.id, request)
                            setShowRequestsModal(false)
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className={styles.rejectButton}
                          onClick={() => {
                            handleRejectRequest(request.id, request)
                            setShowRequestsModal(false)
                          }}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}