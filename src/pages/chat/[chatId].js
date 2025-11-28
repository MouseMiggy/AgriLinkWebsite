import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../../lib/firebase'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  where,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { uploadImageToFirebaseStorage } from '../../lib/firebaseStorage'
import styles from '../../../styles/modules/chatroom.module.css'

export default function ChatRoom() {
  const router = useRouter()
  const { chatId } = router.query
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [sending, setSending] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [respondingToRequest, setRespondingToRequest] = useState(new Set())
  const [requestStatus, setRequestStatus] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [listingName, setListingName] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Ensure immediate scroll to bottom when chat loads with existing messages
  useEffect(() => {
    if (messages.length > 0) {
      // First scroll immediately without animation for initial load
      setTimeout(() => scrollToBottom(false), 50)
      // Then a smooth scroll to ensure we're at the bottom
      setTimeout(() => scrollToBottom(true), 150)
    }
  }, [messages.length > 0])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        // Get user role
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role)
          }
        } catch (error) {
          console.error('Error loading user role:', error)
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Load other user info and listing name
  useEffect(() => {
    if (!chatId || !user) return

    const loadChatInfo = async () => {
      try {
        // Extract user IDs from chat ID format: userId_crop_farmer_to_ownerId_livestock_owner
        const match = chatId.match(/^(.+)_crop_farmer_to_(.+)_livestock_owner$/)
        const participants = match ? [match[1], match[2]] : []
        const otherUserId = participants.find(id => id !== user.uid)
        
        if (otherUserId) {
          console.log('👤 Loading user data for:', otherUserId)
          // Fetch full user data from Users collection
          const userDoc = await getDoc(doc(db, 'Users', otherUserId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            console.log('📋 User data:', {
              firstName: userData.firstName,
              lastName: userData.lastName,
              displayName: userData.displayName,
              email: userData.email
            })
            const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                            userData.displayName || 
                            userData.email?.split('@')[0] || 
                            'User'
            console.log('✅ Full name constructed:', fullName)
            setOtherUser({ 
              id: otherUserId, 
              name: fullName,
              email: userData.email || ''
            })
          } else {
            console.log('⚠️ User document not found for:', otherUserId)
          }
        }

        // Try to get listing name from multiple sources
        let foundListingName = null

        // 1. Try chat document first
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (chatDoc.exists()) {
          const chatData = chatDoc.data()
          console.log('📄 Chat document data:', chatData)
          if (chatData.listingName) {
            console.log('✅ Found listing name in chat doc:', chatData.listingName)
            foundListingName = chatData.listingName
          }
        }

        // 2. If not found, try listing_requests
        if (!foundListingName) {
          const cropFarmerId = match[1]
          const livestockOwnerId = match[2]
          
          const requestsQuery = query(
            collection(db, 'listing_requests'),
            where('requesterId', '==', cropFarmerId),
            where('listingOwnerId', '==', livestockOwnerId)
          )
          
          const requestsSnapshot = await getDocs(requestsQuery)
          console.log('📋 Listing requests found:', requestsSnapshot.size)
          if (!requestsSnapshot.empty) {
            // Get the most recent request
            const requests = requestsSnapshot.docs.map(doc => doc.data())
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0)
              const bTime = b.createdAt?.toDate?.() || new Date(0)
              return bTime - aTime
            })
            const requestData = requests[0]
            console.log('📋 Latest request data:', requestData)
            if (requestData.listingName) {
              console.log('✅ Found listing name in request:', requestData.listingName)
              foundListingName = requestData.listingName
            }
          }
        }

        // Set the listing name if found
        if (foundListingName) {
          console.log('🎯 Setting listing name:', foundListingName)
          setListingName(foundListingName)
        } else {
          console.log('⚠️ No listing name found')
        }
      } catch (error) {
        console.error('Error loading chat info:', error)
      }
    }

    loadChatInfo()
  }, [chatId, user])

  // Check request status based on the specific listing in this chat
  useEffect(() => {
    if (!chatId || !user) return

    const checkRequestStatus = async () => {
      try {
        // Extract user IDs from chat ID
        const match = chatId.match(/^(.+)_crop_farmer_to_(.+)_livestock_owner$/)
        if (!match) {
          console.log('⚠️ Invalid chat ID format')
          return
        }

        const cropFarmerId = match[1]
        const livestockOwnerId = match[2]

        console.log('🔍 Checking request status for:', { cropFarmerId, livestockOwnerId })

        // Query ALL requests between these two users
        const requestsRef = collection(db, 'listing_requests')
        const q = query(
          requestsRef,
          where('requesterId', '==', cropFarmerId),
          where('listingOwnerId', '==', livestockOwnerId)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('📋 Requests snapshot size:', snapshot.size)
          
          if (!snapshot.empty) {
            // Get the most recent request
            const requests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            
            // Sort by createdAt descending
            requests.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0)
              const bTime = b.createdAt?.toDate?.() || new Date(0)
              return bTime - aTime
            })
            
            const latestRequest = requests[0]
            console.log('✅ Latest request status:', latestRequest.status)
            setRequestStatus(latestRequest.status || 'pending')
          } else {
            console.log('⚠️ No requests found, disabling chat')
            setRequestStatus(null)
          }
        })

        return unsubscribe
      } catch (error) {
        console.error('❌ Error checking request status:', error)
      }
    }

    const unsubscribe = checkRequestStatus()
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsub => unsub && unsub())
      } else if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [chatId, user])

  // Listen to messages
  useEffect(() => {
    if (!chatId) return

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMessages(messagesList)

      // Extract listing name from messages as fallback
      const listingMessage = messagesList.find(msg => msg.listingTitle || msg.listingName)
      if (listingMessage) {
        const messageListing = listingMessage.listingTitle || listingMessage.listingName
        console.log('📨 Found listing name in message:', messageListing)
        setListingName(prev => prev || messageListing)
      }

      // Mark messages as read
      if (user) {
        snapshot.docs.forEach(async (messageDoc) => {
          const messageData = messageDoc.data()
          if (messageData.senderId !== user.uid && !messageData.read) {
            await updateDoc(messageDoc.ref, {
              read: true
            })
          }
        })
      }
    })

    return () => unsubscribe()
  }, [chatId, user])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending || !user || !otherUser) return

    setSending(true)
    try {
      let imageUrl = null
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImageToFirebaseStorage(selectedImage, 'Images/Feed', user.uid)
      }
      // Check if current user is livestock owner and if there are pending requests
      const userDoc = await getDoc(doc(db, 'Users', user.uid))
      const userRole = userDoc.exists() ? userDoc.data().role : null
      
      if (userRole === 'livestock_owner') {
        // Check if there's an approved request between these users
        const requestsQuery = query(
          collection(db, 'listing_requests'),
          where('requesterId', '==', otherUser.id),
          where('listingOwnerId', '==', user.uid),
          where('status', '==', 'approved')
        )
        
        const requestsSnapshot = await getDocs(requestsQuery)
        
        if (requestsSnapshot.empty) {
          console.log('Access denied: livestock owner can only chat with approved crop farmers')
          setSending(false)
          return
        }
      } else if (userRole === 'crop_farmer') {
        // Check if crop farmer has any active (pending or approved) requests with this livestock owner
        const requestsQuery = query(
          collection(db, 'listing_requests'),
          where('requesterId', '==', user.uid),
          where('listingOwnerId', '==', otherUser.id),
          where('status', 'in', ['pending', 'approved'])
        )
        
        const requestsSnapshot = await getDocs(requestsQuery)
        
        if (requestsSnapshot.empty) {
          console.log('Access denied: crop farmer needs active request to chat')
          setSending(false)
          return
        }
      }
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'User',
        receiverId: otherUser.id,
        createdAt: new Date(),
        read: false
      }

      if (imageUrl) {
        messageData.imageUrl = imageUrl
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      // Update or create chat document with last message info and participant names
      const chatRef = doc(db, 'chats', chatId)
      const chatDoc = await getDoc(chatRef)
      
      const lastMessageText = imageUrl ? (newMessage.trim() || '📷 Photo') : newMessage.trim()
      const chatUpdateData = {
        lastMessage: lastMessageText,
        lastMessageTime: new Date(),
        lastMessageSenderId: user.uid,
        participants: [user.uid, otherUser.id]
      }
      
      // Add participant names if not already present
      if (!chatDoc.exists() || !chatDoc.data().participantNames) {
        chatUpdateData.participantNames = {
          [user.uid]: user.displayName || 'User',
          [otherUser.id]: otherUser.name || 'User'
        }
        chatUpdateData.participantEmails = {
          [user.uid]: user.email || '',
          [otherUser.id]: otherUser.email || ''
        }
      }
      
      if (chatDoc.exists()) {
        await updateDoc(chatRef, chatUpdateData)
      } else {
        await setDoc(chatRef, chatUpdateData)
      }

      setNewMessage('')
      removeImage()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Handle approve/decline request (matching mobile app functionality)
  const handleRequestResponse = async (message, action) => {
    if (respondingToRequest.has(message.id)) return
    
    setRespondingToRequest(prev => new Set([...prev, message.id]))
    
    try {
      const responseText = action === 'approve' 
        ? `I have approved your request for "${message.listingTitle || 'the listing'}". Let's discuss the details!`
        : `I have declined your request for "${message.listingTitle || 'the listing'}". Thank you for your interest.`
      
      // Send response message
      const responseMessageData = {
        text: responseText,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Livestock Owner',
        senderRole: 'livestock_owner',
        receiverId: message.senderId,
        receiverRole: 'crop_farmer',
        createdAt: serverTimestamp(),
        read: false,
        listingId: message.listingId,
        listingTitle: message.listingTitle,
        listingType: 'livestock_listing',
        messageType: `listing_${action}`,
        isListingResponse: true,
        responseAction: action,
        originalRequestId: message.id
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), responseMessageData)
      
      // Mark original request message as responded
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        hasResponse: true,
        responseAction: action,
        respondedAt: serverTimestamp()
      })
      
      // Update the listing request status in the listing_requests collection
      if (message.listingId) {
        try {
          const requestsQuery = query(
            collection(db, 'listing_requests'),
            where('listingId', '==', message.listingId),
            where('requesterId', '==', message.senderId),
            where('listingOwnerId', '==', user.uid)
          )
          
          const requestsSnapshot = await getDocs(requestsQuery)
          
          // Update all matching request documents (only if they're still pending)
          const batch = writeBatch(db)
          let updatedCount = 0
          
          requestsSnapshot.forEach((requestDoc) => {
            const requestData = requestDoc.data()
            
            // Only update if the request is still pending
            if (requestData.status === 'pending') {
              batch.update(requestDoc.ref, {
                status: action === 'approve' ? 'approved' : 'declined',
                [action === 'approve' ? 'approvedAt' : 'rejectedAt']: serverTimestamp(),
                respondedInChat: true
              })
              updatedCount++
            } else {
              console.log(`⚠️ Skipping update for request ${requestDoc.id} - already has status: ${requestData.status}`)
            }
          })
          
          await batch.commit()
          console.log(`✅ Updated ${updatedCount} out of ${requestsSnapshot.size} request document(s) with status: ${action === 'approve' ? 'approved' : 'declined'}`)
          
          // Remove from crop farmer's requestedListings to restore "Request" button (for both approve and decline)
          try {
            const cropFarmerDoc = await getDoc(doc(db, 'Users', message.senderId))
            if (cropFarmerDoc.exists()) {
              const userData = cropFarmerDoc.data()
              const requestedListingIds = userData.requestedListings || []
              const updatedRequestedListings = requestedListingIds.filter(id => id !== message.listingId)
              
              await updateDoc(doc(db, 'Users', message.senderId), {
                requestedListings: updatedRequestedListings
              })
              
              console.log(`✅ Removed listing from crop farmer's requested listings after ${action}:`, message.listingId)
            }
          } catch (userUpdateError) {
            console.error('⚠️ Error updating crop farmer\'s requested listings:', userUpdateError)
          }
        } catch (requestUpdateError) {
          console.error('❌ Error updating listing request status:', requestUpdateError)
        }
      }
      
      // Update chat document
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, message.senderId],
        participantRoles: {
          [user.uid]: 'livestock_owner',
          [message.senderId]: 'crop_farmer'
        },
        participantNames: {
          [user.uid]: user.displayName || user.email || 'Livestock Owner',
          [message.senderId]: message.senderName || 'Crop Farmer'
        },
        chatType: 'crop_farmer_to_livestock_owner',
        initiatorRole: 'crop_farmer',
        receiverRole: 'livestock_owner',
        lastMessage: responseText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      console.log(`Request ${action}d successfully. Crop farmer has been notified.`)
    } catch (error) {
      console.error('Error responding to request:', error)
      console.error('Failed to send response. Please try again.')
    } finally {
      setRespondingToRequest(prev => {
        const newSet = new Set(prev)
        newSet.delete(message.id)
        return newSet
      })
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!user) {
    router.push('/signin')
    return null
  }

  return (
    <div className={styles.appContainer}>
      {/* Left Sidebar Menu */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <img src="/assets/icons/logo.png" alt="AgriLink" className={styles.logoIcon} />
            <span className={styles.logoText}>AgriLink</span>
          </div>
        </div>
        
        <div className={styles.sidebarContent}>
          <nav className={styles.navigation}>
            <button 
              className={styles.navItem}
              onClick={() => router.push('/dashboard')}
            >
              <img src="/assets/icons/dashboard.png" alt="Dashboard" className={styles.navIcon} />
              <span>Dashboard</span>
            </button>
            
            <button 
              className={`${styles.navItem} ${styles.active}`}
              onClick={() => router.push('/chat')}
            >
              <img src="/assets/icons/chat.png" alt="Messages" className={styles.navIcon} />
              <span>Messages</span>
            </button>
            
            <button 
              className={styles.navItem}
              onClick={() => router.push('/marketplace')}
            >
              <img src="/assets/icons/marketplace.png" alt="Marketplace" className={styles.navIcon} />
              <span>Marketplace</span>
            </button>
            
            <button 
              className={styles.navItem}
              onClick={() => router.push('/community')}
            >
              <img src="/assets/icons/community.png" alt="Community" className={styles.navIcon} />
              <span>Community</span>
            </button>
            
            <button 
              className={styles.navItem}
              onClick={() => router.push('/profile')}
            >
              <img src="/assets/icons/profile.png" alt="Profile" className={styles.navIcon} />
              <span>Profile</span>
            </button>
          </nav>
        </div>
        
        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.userProfileAvatar}>
              {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
            </div>
            <div className={styles.userProfileInfo}>
              <span className={styles.userProfileName}>{user?.displayName || 'User'}</span>
              <span className={styles.userProfileEmail}>{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatContainer}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/dashboard')}
          >
            <img src="/assets/icons/back.png" alt="Back" className={styles.backIcon} />
          </button>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {otherUser?.name ? otherUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className={styles.userDetails}>
              <h3 className={styles.userName}>
                <span>{otherUser?.name || 'User'}</span>
                {listingName && (
                  <>
                    <span className={styles.listingSeparator}> • </span>
                    <span className={styles.listingName}>{listingName}</span>
                  </>
                )}
                {/* Debug: Show what we have */}
                {console.log('🎯 Chat Title Debug:', { 
                  otherUserName: otherUser?.name, 
                  listingName: listingName,
                  hasListingName: !!listingName 
                })}
              </h3>
              <span className={styles.userStatus}>Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyMessages}>
              <img src="/assets/icons/chat.png" alt="No messages" className={styles.emptyIcon} />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwnMessage = message.senderId === user.uid
              const showTime = index === 0 || 
                (messages[index - 1] && 
                 new Date(message.createdAt?.toDate?.() || message.createdAt) - 
                 new Date(messages[index - 1].createdAt?.toDate?.() || messages[index - 1].createdAt) > 300000)

              return (
                <div key={message.id} className={styles.messageGroup}>
                  {showTime && (
                    <div className={styles.timeStamp}>
                      {formatTime(message.createdAt)}
                    </div>
                  )}
                  <div className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
                    <div className={styles.messageContent}>
                      {/* Listing request preview */}
                      {message.isListingRequest && message.listingId && (
                        <div className={styles.listingPreview}>
                          <div className={styles.listingPreviewHeader}>
                            <span className={styles.listingIcon}>🐄</span>
                            <span className={styles.listingPreviewTitle}>
                              {message.listingTitle || 'Livestock Listing'}
                            </span>
                          </div>
                          <p className={styles.listingPreviewSubtitle}>Listing Request</p>
                          
                          {/* Show approve/decline buttons for livestock owner */}
                          {!isOwnMessage && !message.hasResponse && !message.isCancelled && userRole === 'livestock_owner' && (
                            <div className={styles.requestActions}>
                              <button
                                className={`${styles.requestActionButton} ${styles.declineButton}`}
                                onClick={() => handleRequestResponse(message, 'decline')}
                                disabled={respondingToRequest.has(message.id)}
                              >
                                ❌ {respondingToRequest.has(message.id) ? 'Processing...' : 'Decline'}
                              </button>
                              
                              <button
                                className={`${styles.requestActionButton} ${styles.approveButton}`}
                                onClick={() => handleRequestResponse(message, 'approve')}
                                disabled={respondingToRequest.has(message.id)}
                              >
                                ✅ {respondingToRequest.has(message.id) ? 'Processing...' : 'Approve'}
                              </button>
                            </div>
                          )}
                          
                          {/* Show response status if already responded */}
                          {message.hasResponse && (
                            <div className={styles.responseStatus}>
                              <span className={styles.responseIcon}>
                                {message.responseAction === 'approve' ? '✅' : '❌'}
                              </span>
                              <span className={styles.responseStatusText}>
                                {message.responseAction === 'approve' ? 'Approved' : 'Declined'}
                              </span>
                            </div>
                          )}
                          
                          {/* Show cancelled status */}
                          {message.isCancelled && (
                            <div className={styles.responseStatus}>
                              <span className={styles.responseIcon}>🚫</span>
                              <span className={styles.responseStatusText}>Cancelled</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {message.imageUrl && (
                        <img src={message.imageUrl} alt="Sent image" className={styles.messageImage} />
                      )}
                      {message.text && (
                        <p className={styles.messageText}>{message.text}</p>
                      )}
                    </div>
                    {isOwnMessage && (
                      <div className={styles.messageStatus}>
                        {message.read ? (
                          <img src="/assets/icons/read.png" alt="Read" className={styles.statusIcon} />
                        ) : (
                          <img src="/assets/icons/sent.png" alt="Sent" className={styles.statusIcon} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className={styles.messageInputContainer}>
          {requestStatus !== 'approved' && (
            <div className={styles.chatDisabledMessage}>
              <p>💬 {userRole === 'crop_farmer' ? 'Chat is disabled until the livestock owner approves your request' : 'Chat is disabled until you approve the request'}</p>
            </div>
          )}
          
          {/* Image Preview */}
          {imagePreview && (
            <div className={styles.imagePreviewContainer}>
              <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
              <button onClick={removeImage} className={styles.removeImageButton}>×</button>
            </div>
          )}
          
          <div className={styles.inputWrapper}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || requestStatus !== 'approved'}
              className={styles.imageButton}
              title="Insert image"
            >
              <svg className={styles.imageIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={requestStatus === 'approved' ? "Type a message..." : "Waiting for approval..."}
              className={styles.messageInput}
              rows={1}
              disabled={sending || requestStatus !== 'approved'}
            />
            <button 
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || sending || requestStatus !== 'approved'}
              className={styles.sendButton}
            >
              <img src="/assets/icons/send.png" alt="Send" className={styles.sendIcon} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
