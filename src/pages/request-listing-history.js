import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import styles from '../../styles/modules/request-listing-history.module.css'

export default function RequestListingHistory() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'confirm'
    onConfirm: null,
    onCancel: null
  })

  // Auth state listener
  useEffect(() => {
    if (!auth) {
      setLoading(false)
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
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
        }
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Fetch user's listing requests
  useEffect(() => {
    if (!user || !db) {
      setLoading(false)
      return
    }

    console.log('Setting up listener for user:', user.uid)
    
    const q = query(
      collection(db, 'listing_requests'),
      where('requesterId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Received snapshot with', snapshot.size, 'documents')
      const requestsData = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('Document data:', data)
        requestsData.push({
          id: doc.id,
          ...data
        })
      })
      
      // Sort by createdAt - newest first (descending order)
      requestsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return bTime - aTime // bTime - aTime = newest first
      })
      
      console.log('Final requests array (sorted newest first):', requestsData)
      console.log('Requests with status info:', requestsData.map(r => ({ id: r.id, status: r.status, listingName: r.listingName })))
      setRequests(requestsData)
      setLoading(false)
    }, (error) => {
      console.error('Error in snapshot listener:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, db])

  // Popup helper functions
  const showInfoPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'info',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showSuccessPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'success',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showErrorPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'error',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showConfirmPopup = (title, message, onConfirm) => {
    setPopupConfig({
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        setShowPopup(false)
        onConfirm()
      },
      onCancel: () => setShowPopup(false)
    })
    setShowPopup(true)
  }

  const cancelRequest = async (requestId) => {
    console.log('🚀 Cancel request called for ID:', requestId)
    
    // Find the request to get owner information
    const requestToCancel = requests.find(req => req.id === requestId)
    console.log('📋 Request to cancel:', requestToCancel)
    
    if (!requestToCancel) {
      console.error('❌ Request not found in local state')
      showErrorPopup('Error', 'Request not found')
      return
    }

    // Show confirmation popup
    showConfirmPopup(
      'Cancel Request',
      `Are you sure you want to cancel your request for "${requestToCancel.listingName}"?`,
      async () => {
        await performCancelRequest(requestId, requestToCancel)
      }
    )
  }

  const performCancelRequest = async (requestId, requestToCancel) => {
    try {

      // Send notification message to the chat between users
      const participants = [user.uid, requestToCancel.listingOwnerId].sort()
      const chatId = `${user.uid}_crop_farmer_to_${requestToCancel.listingOwnerId}_livestock_owner`
      const fallbackChatId = participants.join('_')
      console.log('💬 Primary Chat ID:', chatId)
      console.log('💬 Fallback Chat ID:', fallbackChatId)
      
      const messageData = {
        text: `I have cancelled my request for "${requestToCancel.listingName}". Thank you for your time.`,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Crop Farmer',
        receiverId: requestToCancel.listingOwnerId,
        createdAt: serverTimestamp(),
        read: false,
        type: 'request_cancellation'
      }

      console.log('📤 Sending message to chat:', messageData)

      // Try to add message to the chat (try both chat ID formats)
      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
        console.log('✅ Message sent with primary chat ID')
      } catch (primaryError) {
        console.log('⚠️ Primary chat ID failed, trying fallback...')
        await addDoc(collection(db, 'chats', fallbackChatId, 'messages'), messageData)
        console.log('✅ Message sent with fallback chat ID')
      }
      
      // Update chat's last message (try both formats)
      try {
        const chatRef = doc(db, 'chats', chatId)
        await updateDoc(chatRef, {
          lastMessage: messageData.text,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.uid
        })
        console.log('✅ Chat updated with primary chat ID')
      } catch (primaryUpdateError) {
        console.log('⚠️ Primary chat update failed, trying fallback...')
        const fallbackChatRef = doc(db, 'chats', fallbackChatId)
        await updateDoc(fallbackChatRef, {
          lastMessage: messageData.text,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.uid
        })
        console.log('✅ Chat updated with fallback chat ID')
      }

      console.log('🔄 Updating request status to cancelled:', requestId)
      // Update request status to cancelled instead of deleting
      await updateDoc(doc(db, 'listing_requests', requestId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      })
      
      console.log('✅ Request cancelled successfully')
      showSuccessPopup('Success', 'Request cancelled successfully and owner has been notified')
    } catch (error) {
      console.error('❌ Error cancelling request:', error)
      showErrorPopup('Error', 'Failed to cancel request: ' + error.message)
    }
  }


  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  // Function to truncate text at specific character limit
  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107'
      case 'approved':
        return '#28a745'
      case 'declined':
        return '#dc3545'
      case 'cancelled':
        return '#6c757d'
      default:
        return '#6c757d'
    }
  }

  console.log('RequestListingHistory render:', {
    loading,
    userUid: user?.uid,
    userRole,
    requestsCount: requests.length,
    hasDb: !!db,
    requests: requests
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Request Listing History</h1>
            </div>
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading Request Listing History...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Please log in to view your requests.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Request Listing History</h1>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className={styles.emptyState}>
          <img src="/assets/icons/listing.png" alt="No requests" className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No Requests Yet</h3>
          <p className={styles.emptyText}>
            You haven't made any listing requests yet. Browse the listings page to request livestock from owners.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          {/* Table Header */}
          <div className={styles.tableHeader}>
            <div className={styles.headerOwner}>Owner</div>
            <div className={styles.headerListing}>Listing Name</div>
            <div className={styles.headerPrice}>Price</div>
            <div className={styles.headerStatus}>Status</div>
            <div className={styles.headerDate}>Date & Time Requested</div>
            <div className={styles.headerActions}>Actions</div>
          </div>
          
          {/* Table Body */}
          <div className={styles.requestsList}>
            {requests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              {/* User Name (truncated at 35 chars) */}
              <div className={styles.ownerName} title={request.listingOwnerName || 'Unknown Owner'}>
                {truncateText(request.listingOwnerName || 'Unknown Owner', 35)}
              </div>
              
              {/* Title (truncated at 35 chars) */}
              <div className={styles.listingName} title={request.listingName || 'Unnamed Listing'}>
                {truncateText(request.listingName || 'Unnamed Listing', 35)}
              </div>
              
              {/* Price */}
              <div className={styles.price}>
                {request.listing?.price || 'N/A'}
              </div>
              
              {/* Status */}
              <div 
                className={styles.statusBadge}
                style={{ backgroundColor: getStatusColor(request.status || 'pending') }}
              >
                {(request.status || 'pending').charAt(0).toUpperCase() + (request.status || 'pending').slice(1)}
              </div>
              
              {/* Date and Time of Request */}
              <div className={styles.dateTime}>
                {formatDate(request.createdAt)}
              </div>
              
              {/* Actions - Always present to maintain alignment */}
              <div className={styles.actionColumn}>
                {(request.status === 'pending' || !request.status) ? (
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      console.log('🔘 Cancel button clicked for request:', request.id, 'Status:', request.status)
                      cancelRequest(request.id)
                    }}
                  >
                    Cancel Request
                  </button>
                ) : (
                  <div className={styles.actionPlaceholder}></div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Custom AgriLink Popup */}
      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <div className={styles.popupHeader}>
              <h3 className={styles.popupTitle}>{popupConfig.title}</h3>
            </div>
            <div className={styles.popupContent}>
              <p className={styles.popupMessage}>{popupConfig.message}</p>
            </div>
            <div className={styles.popupActions}>
              {popupConfig.type === 'confirm' ? (
                <>
                  <button 
                    className={styles.popupButtonCancel}
                    onClick={popupConfig.onCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.popupButtonConfirm}
                    onClick={popupConfig.onConfirm}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  className={`${styles.popupButton} ${styles[popupConfig.type]}`}
                  onClick={popupConfig.onConfirm}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
