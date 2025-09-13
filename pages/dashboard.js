import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment, 
  deleteDoc,
  where,
  getDocs,
  arrayUnion,
  getDoc,
  setDoc
} from 'firebase/firestore'
import { uploadImageToCloudinary } from '../lib/cloudinary'
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '../lib/notificationService'
import styles from '../styles/dashboard.module.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [postText, setPostText] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const [showDropdown, setShowDropdown] = useState(null)
  const [conversations, setConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [showAllComments, setShowAllComments] = useState({})
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [currentPost, setCurrentPost] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const router = useRouter()

  // Handle ESC key to close comment modal and dropdown
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (showCommentModal) {
          closeCommentModal()
        }
        if (showDropdown) {
          setShowDropdown(null)
        }
      }
    }

    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(`.${styles.postOptions}`) && !event.target.closest(`.${styles.dropdown}`)) {
        setShowDropdown(null)
      }
    }

    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showCommentModal, showDropdown])

  // Listen for auth state changes and real-time posts
  useEffect(() => {
    if (!auth || !db) return // Wait for Firebase to initialize

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Load user data from Firestore to get firstName and lastName
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              firstName: userData.firstName || currentUser.displayName?.split(' ')[0] || 'User',
              lastName: userData.lastName || currentUser.displayName?.split(' ')[1] || '',
              email: currentUser.email,
              uid: currentUser.uid
            })
            console.log('Loaded user role:', userData.role)
            setUserRole(userData.role || null)
          } else {
            console.log('User document does not exist')
            setUser({
              firstName: currentUser.displayName?.split(' ')[0] || 'User',
              lastName: currentUser.displayName?.split(' ')[1] || '',
              email: currentUser.email,
              uid: currentUser.uid
            })
            setUserRole(null)
          }
        } catch (error) {
          console.error('Error loading user data:', error)
          setUser({
            firstName: currentUser.displayName?.split(' ')[0] || 'User',
            lastName: currentUser.displayName?.split(' ')[1] || '',
            email: currentUser.email,
            uid: currentUser.uid
          })
          setUserRole(null)
        }
      } else {
        router.push('/signin')
      }
    })

    // Real-time posts listener (same as mobile app)
    const q = query(collection(db, 'Posts'), orderBy('createdAt', 'desc'))
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPosts(fetchedPosts)
    })

    // Listen to notifications when user is authenticated
    let unsubscribeNotifications = null
    if (user) {
      unsubscribeNotifications = listenToNotifications(user.uid, (notificationsList) => {
        setNotifications(notificationsList)
        const unreadNotifications = notificationsList.filter(n => !n.read)
        setUnreadCount(unreadNotifications.length)
      })
    }

    return () => {
      unsubscribeAuth()
      unsubscribePosts()
      if (unsubscribeNotifications) {
        unsubscribeNotifications()
      }
    }
  }, [router])

  // Load conversations with real-time listener
  useEffect(() => {
    if (!auth || !db || !user) return

    const unsubscribe = loadConversations()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  const loadConversations = () => {
    if (!user || !db) return

    // Set up real-time listener for chats
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    
    const unsubscribe = onSnapshot(chatsQuery, (chatsSnapshot) => {
      const conversationsList = []
      
      // Process each chat
      chatsSnapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id
        const chatData = chatDoc.data()
        const otherUserId = chatData.participants?.find(id => id !== user.uid)
        
        if (otherUserId && chatData.participantNames) {
          const otherUserName = chatData.participantNames[otherUserId] || 'User'
          const otherUserEmail = chatData.participantEmails?.[otherUserId] || ''
          
          // Set up real-time listener for messages in this chat
          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'desc')
          )
          
          onSnapshot(messagesQuery, (messagesSnapshot) => {
            let unreadCount = 0
            let isLastMessageFromOther = false
            let actualLastMessage = chatData.lastMessage || 'No messages yet'
            let actualLastMessageTime = chatData.lastMessageTime
            let actualLastMessageSenderId = chatData.lastMessageSenderId
            
            // Count unread messages from other user
            messagesSnapshot.docs.forEach(msgDoc => {
              const msgData = msgDoc.data()
              if (msgData.senderId !== user.uid && !msgData.read) {
                unreadCount++
              }
            })
            
            // Get actual last message
            if (messagesSnapshot.docs.length > 0) {
              const lastMsg = messagesSnapshot.docs[0].data()
              isLastMessageFromOther = lastMsg.senderId !== user.uid
              actualLastMessage = lastMsg.text
              actualLastMessageTime = lastMsg.createdAt
              actualLastMessageSenderId = lastMsg.senderId
            }
            
            // Update conversations state
            setConversations(prevConversations => {
              const updatedConversations = prevConversations.filter(conv => conv.id !== chatId)
              const newConversation = {
                id: chatId,
                otherUserId,
                otherUserName,
                otherUserEmail,
                lastMessage: actualLastMessage,
                lastMessageTime: actualLastMessageTime,
                lastMessageSenderId: actualLastMessageSenderId,
                unreadCount,
                isLastMessageFromOther
              }
              
              updatedConversations.push(newConversation)
              
              // Auto-open chat if there's a new message from someone else
              if (isLastMessageFromOther && unreadCount > 0) {
                setShowChat(true)
                setShowNotifications(false) // Close notifications if open
              }
              
              // Sort by last message time
              return updatedConversations.sort((a, b) => {
                if (!a.lastMessageTime && !b.lastMessageTime) return 0
                if (!a.lastMessageTime) return 1
                if (!b.lastMessageTime) return -1
                const aTime = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : new Date(a.lastMessageTime).getTime()
                const bTime = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : new Date(b.lastMessageTime).getTime()
                return bTime - aTime
              })
            })
          })
          
          // Add initial conversation data
          conversationsList.push({
            id: chatId,
            otherUserId,
            otherUserName,
            otherUserEmail,
            lastMessage: chatData.lastMessage || 'No messages yet',
            lastMessageTime: chatData.lastMessageTime,
            lastMessageSenderId: chatData.lastMessageSenderId,
            unreadCount: 0,
            isLastMessageFromOther: false
          })
        }
      })
      
      // Set initial conversations
      setConversations(conversationsList)
    })
    
    return unsubscribe
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredConversations = conversations.filter(conversation => {
    const name = conversation.otherUserName || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
      router.push('/signin')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/signin')
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const openPostModal = () => {
    setShowPostModal(true)
  }

  const closePostModal = () => {
    setShowPostModal(false)
    setPostText('')
    setImageFile(null)
    setImagePreview(null)
  }

  // Auto-resize textarea and adjust font size based on content length
  const handleTextChange = (e) => {
    const text = e.target.value
    setPostText(text)
    
    const textarea = e.target
    
    // Auto-resize textarea to fit content
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    
    // Adjust modal body height dynamically based on text content
    const modalBody = textarea.closest(`.${styles.modalBody}`) || 
                     document.querySelector(`.${styles.modalBody}`)
    
    if (modalBody) {
      const textLength = text.length
      
      if (textLength === 0) {
        // Reset to minimum when no text
        modalBody.style.height = 'auto'
        modalBody.style.minHeight = '120px'
        modalBody.style.maxHeight = 'none'
        modalBody.style.overflow = 'hidden'
        textarea.style.fontSize = '24px'
        textarea.style.height = '120px'
      } else {
        // Count lines of text
        const lines = text.split('\n').length
        const textareaHeight = textarea.scrollHeight
        const padding = 32 // modalBody padding
        const requiredHeight = textareaHeight + padding
        
        // Set max height to current modal height (around 400px for modal body)
        const maxModalBodyHeight = 400
        
        if (lines >= 9 || requiredHeight >= maxModalBodyHeight) {
          // When reaching 9 lines or max height, enable scroll and force 15px font permanently
          modalBody.style.height = maxModalBodyHeight + 'px'
          modalBody.style.maxHeight = maxModalBodyHeight + 'px'
          modalBody.style.overflow = 'auto'
          textarea.style.fontSize = '15px'
        } else {
          // Container can grow, check if font was already set to 15px
          const currentFontSize = parseInt(textarea.style.fontSize || '24px')
          
          if (currentFontSize === 15) {
            // Keep 15px once it's been set, don't change back
            textarea.style.fontSize = '15px'
          } else {
            // Use normal font size until we hit 9 lines
            textarea.style.fontSize = '24px'
          }
          
          modalBody.style.height = 'auto'
          modalBody.style.minHeight = requiredHeight + 'px'
          modalBody.style.maxHeight = 'none'
          modalBody.style.overflow = 'hidden'
        }
      }
    }
  }

  const handlePost = async () => {
    if ((!postText.trim() && !imageFile) || !user || !db) return

    setLoading(true)
    try {
      let imageUrl = null
      
      // Upload image to Cloudinary if selected
      if (imageFile) {
        console.log('Uploading image to Cloudinary...')
        imageUrl = await uploadImageToCloudinary(imageFile)
        console.log('Image uploaded successfully:', imageUrl)
      }

      console.log('Saving post to Firestore...')
      
      // Create post with same structure as mobile app
      const postData = {
        text: postText.trim(),
        userId: user.uid,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        imageUrl: imageUrl,
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      }
      
      console.log('Post data:', postData)
      
      await addDoc(collection(db, 'Posts'), postData)

      console.log('Post created successfully!')
      
      setPostText('')
      setImageFile(null)
      setImagePreview(null)
      closePostModal()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLikePost = async (post) => {
    if (!user || !db) return

    try {
      const postRef = doc(db, 'Posts', post.id)
      const hasLiked = post.likedBy && post.likedBy.includes(user.uid)
      
      if (hasLiked) {
        // Unlike: remove user from likedBy array and decrease count
        const newLikedBy = post.likedBy.filter(uid => uid !== user.uid)
        await updateDoc(postRef, {
          likes: Math.max(0, (post.likes || 0) - 1),
          likedBy: newLikedBy
        })
      } else {
        // Like: add user to likedBy array and increase count
        const newLikedBy = [...(post.likedBy || []), user.uid]
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1,
          likedBy: newLikedBy
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  // Format time ago (same as mobile app)
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now"
    
    const now = new Date()
    let postTime
    
    if (timestamp.toDate) {
      postTime = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      postTime = timestamp
    } else {
      postTime = new Date(timestamp)
    }
    
    if (isNaN(postTime.getTime())) {
      return "Just now"
    }
    
    const diffInSeconds = Math.floor((now - postTime) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return postTime.toLocaleDateString()
  }

  const hasUserLiked = (post) => {
    return post.likedBy && post.likedBy.includes(user?.uid)
  }

  const toggleShowAllComments = (postId) => {
    setShowAllComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }))
  }

  const getDisplayedComments = (post) => {
    if (!post.comments || post.comments.length === 0) return []
    
    const shouldShowAll = showAllComments[post.id]
    if (shouldShowAll || post.comments.length <= 2) {
      return post.comments
    }
    
    return post.comments.slice(0, 2)
  }

  const openCommentModal = (post) => {
    setSelectedPost(post)
    setShowCommentModal(true)
    setCommentText('')
    // Disable body scroll
    document.body.style.overflow = 'hidden'
  }

  const closeCommentModal = () => {
    setShowCommentModal(false)
    setSelectedPost(null)
    setCommentText('')
    // Re-enable body scroll
    document.body.style.overflow = 'unset'
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !selectedPost) return

    try {
      const postRef = doc(db, 'Posts', selectedPost.id)
      const newComment = {
        text: commentText.trim(),
        userName: user.firstName + ' ' + (user.lastName || ''),
        userEmail: user.email,
        createdAt: new Date()
      }

      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      })

      setCommentText('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleEditPost = (post) => {
    setEditingPost(post.id)
    setEditText(post.text)
    setShowDropdown(null)
  }

  const handleSaveEdit = async (postId) => {
    if (!editText || !db) return

    try {
      const postRef = doc(db, 'Posts', postId)
      await updateDoc(postRef, {
        text: editText,
        editedAt: serverTimestamp()
      })
      setEditingPost(null)
      setEditText('')
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post. Please try again.')
    }
  }

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?') || !db) return

    try {
      await deleteDoc(doc(db, 'Posts', postId))
      setShowDropdown(null)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

  const handleReportPost = (postId) => {
    // Simple report functionality - in real app would send to moderation system
    alert('Post has been reported. Thank you for helping keep our community safe.')
    setShowDropdown(null)
  }

  const toggleDropdown = (postId) => {
    setShowDropdown(showDropdown === postId ? null : postId)
  }

  const isUserPost = (post) => {
    return user && post.userId === user.uid
  }

  const handleSwitchRole = async () => {
    console.log('Switch role button clicked!')
    console.log('Current user:', user)
    console.log('Current userRole:', userRole)
    
    if (!user) {
      alert('Please log in first')
      return
    }
    
    // If no role is set, default to crop_farmer
    const currentRole = userRole || 'crop_farmer'
    const newRole = currentRole === 'livestock_owner' ? 'crop_farmer' : 'livestock_owner'
    const roleNames = {
      livestock_owner: 'Livestock Owner',
      crop_farmer: 'Crop Farmer'
    }
    
    console.log('Switching from:', currentRole, 'to:', newRole)
    
    const confirmed = confirm(`Are you sure you want to switch ${userRole ? `from ${roleNames[currentRole]} ` : ''}to ${roleNames[newRole]}?`)
    
    if (confirmed) {
      try {
        console.log('Updating Firestore...')
        
        // Create user document if it doesn't exist
        await updateDoc(doc(db, 'Users', user.uid), {
          role: newRole,
          roleUpdatedAt: serverTimestamp(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }).catch(async (error) => {
          if (error.code === 'not-found') {
            // Document doesn't exist, create it
            console.log('Creating new user document...')
            await setDoc(doc(db, 'Users', user.uid), {
              role: newRole,
              roleUpdatedAt: serverTimestamp(),
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              uid: user.uid
            })
          } else {
            throw error
          }
        })
        
        // Force state update
        setUserRole(newRole)
        console.log('Role successfully updated to:', newRole)
        alert(`Successfully switched to ${roleNames[newRole]}!`)
      } catch (error) {
        console.error('Error switching role:', error)
        alert('Failed to switch role. Please try again.')
      }
    }
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      livestock_owner: 'Livestock Owner',
      crop_farmer: 'Crop Farmer'
    }
    return roleNames[role] || 'No Role Selected'
  }

  const handleNotificationClick = (notification) => {
    setShowNotifications(false)
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'post_like':
      case 'post_comment':
        // Stay on dashboard (posts are here)
        break
      case 'friend_request':
      case 'friend_accepted':
        // Could navigate to friends/profile page when implemented
        break
      case 'listing_request':
        // Navigate to listings page
        router.push('/listings')
        break
      default:
        // Default behavior - stay on current page
        break
    }
  }

  const sidebarItems = [
    { icon: '/assets/icons/rotate-reverse.png', label: 'Switch Role', onClick: handleSwitchRole },
    { icon: '/assets/icons/time-past.png', label: 'Transaction History' },
    { icon: '/assets/icons/settings.png', label: 'Settings and Privacy' },
    { icon: '/assets/icons/triangle-warning.png', label: 'Reports' }
  ]



  return (
    <div className={styles.container}>
      {/* Facebook-style Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.logo}>AgriLink</h1>
            <div className={styles.searchBar}>
              <input type="text" placeholder="Search AgriLink" />
            </div>
            <div className={styles.mobileSearchIcon} onClick={() => setShowMobileSearch(!showMobileSearch)}>
              🔍
            </div>
          </div>
          <div className={styles.headerCenter}>
            <div className={styles.navIcons}>
              <div className={`${styles.navIcon} ${styles.active}`}>🏠</div>
              <div 
                className={styles.navIcon}
                onClick={() => router.push('/listings')}
                style={{ cursor: 'pointer' }}
              >
                🛒
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div 
              className={`${styles.notificationIcon} ${unreadCount > 0 ? styles.hasUnread : ''}`}
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowChat(false) // Close chat when opening notifications
                setShowProfileMenu(false) // Close profile menu when opening notifications
              }}
              style={{ cursor: 'pointer' }}
            >
              🔔
              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div 
              className={`${styles.chatIcon}`}
              onClick={() => {
                setShowChat(!showChat)
                setShowNotifications(false) // Close notifications when opening chat
                setShowProfileMenu(false) // Close profile menu when opening chat
              }}
              style={{ cursor: 'pointer' }}
            >
              💬
            </div>
            <div 
              className={styles.userProfile}
              onClick={() => {
                setShowProfileMenu(!showProfileMenu)
                setShowNotifications(false) // Close notifications when opening profile
                setShowChat(false) // Close chat when opening profile
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.avatar}>{user?.firstName?.[0]?.toUpperCase() || 'U'}</div>
              <span>{user?.firstName || 'User'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {showMobileSearch && (
          <div className={styles.mobileSearchOverlay}>
            <div className={styles.mobileSearchBar}>
              <input 
                type="text" 
                placeholder="Search AgriLink" 
                className={styles.mobileSearchInput}
                autoFocus
              />
              <button 
                className={styles.mobileSearchClose}
                onClick={() => setShowMobileSearch(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Profile Menu Popup */}
        {showProfileMenu && (
          <div className={styles.profileMenuDropdown}>
            <div className={styles.profileMenuHeader}>
              <div className={styles.profileInfo}>
                <div className={styles.profileAvatar}>{user?.firstName?.[0]?.toUpperCase() || 'U'}</div>
                <div className={styles.profileDetails}>
                  <h4>{user?.firstName} {user?.lastName}</h4>
                  <p>{user?.email}</p>
                  <span className={styles.roleTag}>{getRoleDisplayName(userRole)}</span>
                </div>
              </div>
            </div>
            
            <div className={styles.profileMenuList}>
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                // Navigate to profile page when implemented
              }}>
                <img src="/assets/icons/user.png" alt="Profile" className={styles.menuIcon} />
                <span>Profile</span>
              </div>
              
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                handleSwitchRole()
              }}>
                <img src="/assets/icons/rotate-reverse.png" alt="Switch Role" className={styles.menuIcon} />
                <span>Switch Role</span>
              </div>
              
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                // Navigate to transaction history when implemented
              }}>
                <img src="/assets/icons/time-past.png" alt="Transaction History" className={styles.menuIcon} />
                <span>Transaction History</span>
              </div>
              
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                // Navigate to settings when implemented
              }}>
                <img src="/assets/icons/settings.png" alt="Settings" className={styles.menuIcon} />
                <span>Settings and Privacy</span>
              </div>
              
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                // Navigate to reports when implemented
              }}>
                <img src="/assets/icons/triangle-warning.png" alt="Reports" className={styles.menuIcon} />
                <span>Reports</span>
              </div>
              
              <div className={styles.profileMenuDivider}></div>
              
              <div className={styles.profileMenuItem} onClick={async () => {
                setShowProfileMenu(false)
                try {
                  await auth.signOut()
                  router.push('/signin')
                } catch (error) {
                  console.error('Error signing out:', error)
                }
              }}>
                <img src="/assets/icons/logout.png" alt="Logout" className={styles.menuIcon} />
                <span>Logout</span>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className={styles.notificationsDropdown}>
            <div className={styles.notificationsHeader}>
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  className={styles.markAllReadBtn}
                  onClick={async () => {
                    await markAllNotificationsAsRead(user.uid)
                    setUnreadCount(0)
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className={styles.notificationsList}>
              {notifications.length === 0 ? (
                <div className={styles.noNotifications}>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div 
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                    onClick={async () => {
                      if (!notification.read) {
                        await markNotificationAsRead(notification.id)
                      }
                      handleNotificationClick(notification)
                    }}
                  >
                    <div className={styles.notificationContent}>
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className={styles.notificationTime}>
                        {notification.createdAt ? new Date(notification.createdAt.toDate()).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    {!notification.read && <div className={styles.unreadDot}></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      <div className={styles.mainLayout}>
        {/* Main Feed */}
        <main className={styles.mainFeed}>
          {/* Post Composer - Clickable */}
          <div className={styles.postComposer}>
            <div className={styles.postPrompt}>
              <div className={styles.userAvatar}>
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className={styles.clickableTextBox} onClick={openPostModal}>
                What's on your mind?
              </div>
            </div>
          </div>

          {/* News Feed */}
          <div className={styles.newsFeed}>
            {posts.map((post) => (
              <div key={post.id} className={styles.post}>
                <div className={styles.postHeader}>
                  <div className={styles.postAvatar}>{post.userName ? post.userName[0].toUpperCase() : 'U'}</div>
                  <div className={styles.postInfo}>
                    <h4 className={styles.postAuthor}>{post.userName || 'Anonymous'}</h4>
                    <span className={styles.postTime}>
                      {formatTimeAgo(post.createdAt)}
                      {post.editedAt && <span className={styles.edited}> (edited)</span>}
                    </span>
                  </div>
                  <div className={styles.postOptions}>
                    <button 
                      className={styles.optionsBtn}
                      onClick={() => toggleDropdown(post.id)}
                    >
                      <img src="/assets/icons/menu-dots.png" alt="Options" className={styles.optionsIcon} />
                    </button>
                    {showDropdown === post.id && (
                      <div className={styles.dropdown}>
                        {isUserPost(post) ? (
                          <>
                            <button onClick={() => handleEditPost(post)} className={styles.dropdownItem}>
                              <img src="/assets/icons/settings.png" alt="Edit" className={styles.dropdownIcon} />
                              Edit Post
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className={styles.dropdownItem}>
                              <img src="/assets/icons/cross-small.png" alt="Delete" className={styles.dropdownIcon} />
                              Delete Post
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleReportPost(post.id)} className={styles.dropdownItem}>
                            <img src="/assets/icons/triangle-warning.png" alt="Report" className={styles.dropdownIcon} />
                            Report Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.postContent}>
                  {editingPost === post.id ? (
                    <div className={styles.editContainer}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={styles.editTextarea}
                      />
                      <div className={styles.editActions}>
                        <button onClick={() => handleSaveEdit(post.id)} className={styles.saveBtn}>Save</button>
                        <button onClick={() => setEditingPost(null)} className={styles.cancelBtn}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{post.text}</p>
                  )}
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="Post image" className={styles.postImage} />
                  )}
                </div>
                <div className={styles.postStats}>
                  <span>{post.likes || 0} likes</span>
                  <span>{post.comments?.length || 0} comments</span>
                </div>
                
                <div className={styles.postSeparator}></div>
                
                <div className={styles.postActions}>
                  <button 
                    className={`${styles.actionBtn} ${hasUserLiked(post) ? styles.liked : ''}`}
                    onClick={() => handleLikePost(post)}
                  >
                    <img 
                      src={hasUserLiked(post) ? "/assets/icons/red-heart.png" : "/assets/icons/heart.png"} 
                      alt="Like" 
                      className={styles.actionIcon} 
                    />
                    Like
                  </button>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => openCommentModal(post)}
                  >
                    <img src="/assets/icons/comment-all-dots.png" alt="Comment" className={styles.actionIcon} />
                    Comment
                  </button>
                </div>
                
                {/* Comments Section */}
                {post.comments && post.comments.length > 0 && (
                  <div className={styles.commentsSection}>
                    {getDisplayedComments(post).map((comment, index) => (
                      <div key={index} className={styles.comment}>
                        <div className={styles.commentAvatar}>
                          {comment.userName ? comment.userName[0].toUpperCase() : 'U'}
                        </div>
                        <div className={styles.commentContent}>
                          <div className={styles.commentBubble}>
                            <span className={styles.commentAuthor}>{comment.userName}</span>
                            <p className={styles.commentText}>{comment.text}</p>
                          </div>
                          <span className={styles.commentTime}>
                            {formatTime(comment.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {post.comments.length > 2 && !showAllComments[post.id] && (
                      <button 
                        className={styles.viewAllCommentsBtn}
                        onClick={() => toggleShowAllComments(post.id)}
                      >
                        View all {post.comments.length} comments
                      </button>
                    )}
                    
                    {post.comments.length > 2 && showAllComments[post.id] && (
                      <button 
                        className={styles.viewAllCommentsBtn}
                        onClick={() => toggleShowAllComments(post.id)}
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Post Creation Modal */}
        {showPostModal && (
          <div className={styles.modalOverlay} onClick={closePostModal}>
            <div className={styles.postModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Create Post</h3>
                <button onClick={closePostModal} className={styles.closeModalBtn}>×</button>
              </div>
              
              <div className={styles.modalContent}>
                <div className={styles.modalUserInfo}>
                  <div className={styles.modalUserAvatar}>
                    {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <span className={styles.modalUserName}>
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                
                <div className={styles.modalBody}>
                  <textarea
                    value={postText}
                    onChange={handleTextChange}
                    placeholder="What's on your mind?"
                    className={styles.modalTextarea}
                    rows={4}
                  />
                  
                </div>
                
                <div className={styles.modalFooter}>
                  <div className={styles.modalActions}>
                    <label className={styles.modalImageUpload}>
                      {imagePreview ? (
                        <div className={styles.buttonImagePreview}>
                          <img src={imagePreview} alt="Preview" className={styles.buttonPreviewImage} />
                          <div className={styles.buttonPreviewOverlay}>
                            <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                            Change Photo
                          </div>
                        </div>
                      ) : (
                        <>
                          <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                          Add Photo
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className={styles.hiddenInput}
                      />
                    </label>
                  </div>
                  
                  <button
                    onClick={handlePost}
                    disabled={loading || (!postText.trim() && !imageFile)}
                    className={styles.modalPostButton}
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Popup */}
        {showChat && (
          <div className={styles.chatPopup}>
            <div className={styles.chatPopupHeader}>
              <h3 className={styles.chatPopupTitle}>Chats</h3>
            </div>
            
            {/* Search Bar */}
            <div className={styles.chatSearchContainer}>
              <img src="/assets/icons/search.png" alt="Search" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search conversations"
                className={styles.chatSearchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Conversations List */}
            <div className={styles.conversationsList}>
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className={`${styles.conversationItem} ${conversation.unreadCount > 0 ? styles.hasUnread : ''}`}
                    onClick={() => {
                      setShowChat(false)
                      router.push(`/chat/${conversation.id}`)
                    }}
                  >
                    <div className={styles.conversationAvatar}>
                      {conversation.otherUserName ? conversation.otherUserName[0].toUpperCase() : 'U'}
                    </div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationHeader}>
                        <span className={`${styles.conversationName} ${conversation.unreadCount > 0 ? styles.unread : ''}`}>
                          {conversation.otherUserName || 'User'}
                        </span>
                        {conversation.lastMessageTime && (
                          <span className={`${styles.conversationTime} ${conversation.unreadCount > 0 ? styles.unread : ''}`}>
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className={styles.conversationPreview}>
                        <span className={`${styles.lastMessage} ${conversation.unreadCount > 0 ? styles.unread : ''}`}>
                          {conversation.lastMessage}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <div className={styles.unreadBadge}></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyChats}>
                  <img src="/assets/icons/chat.png" alt="No chats" className={styles.emptyChatIcon} />
                  <p className={styles.emptyChatText}>No conversations yet</p>
                  <p className={styles.emptyChatSubtext}>
                    Request livestock listings to start chatting with owners!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Sidebar - Chats (Hidden by default) */}
        <aside className={styles.rightSidebar} style={{ display: 'none' }}>
          <div className={styles.chatsContainer}>
            <div className={styles.chatsHeader}>
              <h3 className={styles.chatsTitle}>Chats</h3>
            </div>
          </div>
        </aside>
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedPost && (
        <div className={styles.modalOverlay} onClick={closeCommentModal}>
          <div className={styles.commentModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.commentModalHeader}>
              <h3>{selectedPost.userName}'s Post</h3>
              <button onClick={closeCommentModal} className={styles.closeBtn}>×</button>
            </div>
            
            <div className={styles.commentModalContent}>
              {/* Post Content */}
              <div className={styles.modalPostContent}>
                <div className={styles.modalPostHeader}>
                  <div className={styles.modalPostAvatar}>
                    {selectedPost.userName ? selectedPost.userName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className={styles.modalPostAuthor}>{selectedPost.userName}</div>
                    <div className={styles.modalPostTime}>{formatTime(selectedPost.createdAt)}</div>
                  </div>
                </div>
                
                {selectedPost.text && (
                  <p className={styles.modalPostText}>{selectedPost.text}</p>
                )}
                
                {selectedPost.imageUrl && (
                  <img src={selectedPost.imageUrl} alt="Post image" className={styles.modalPostImage} />
                )}
              </div>
              
              {/* Like Stats */}
              <div className={styles.modalPostStats}>
                <span>{posts.find(p => p.id === selectedPost.id)?.likes || 0} likes</span>
                <span>{posts.find(p => p.id === selectedPost.id)?.comments?.length || 0} comments</span>
              </div>
              
              {/* Like Button */}
              <div className={styles.modalPostActions}>
                <button 
                  className={`${styles.modalActionBtn} ${hasUserLiked(posts.find(p => p.id === selectedPost.id) || selectedPost) ? styles.liked : ''}`}
                  onClick={() => handleLikePost(posts.find(p => p.id === selectedPost.id) || selectedPost)}
                >
                  <img 
                    src={hasUserLiked(posts.find(p => p.id === selectedPost.id) || selectedPost) ? "/assets/icons/red-heart.png" : "/assets/icons/heart.png"} 
                    alt="Like" 
                    className={styles.actionIcon} 
                  />
                  Like
                </button>
              </div>
              
              {/* Comments List */}
              <div className={styles.modalCommentsSection}>
                {selectedPost.comments && selectedPost.comments.length > 0 ? (
                  selectedPost.comments.map((comment, index) => (
                    <div key={index} className={styles.modalComment}>
                      <div className={styles.commentAvatar}>
                        {comment.userName ? comment.userName[0].toUpperCase() : 'U'}
                      </div>
                      <div className={styles.commentContent}>
                        <div className={styles.commentBubble}>
                          <span className={styles.commentAuthor}>{comment.userName}</span>
                          <p className={styles.commentText}>{comment.text}</p>
                        </div>
                        <span className={styles.commentTime}>
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.noComments}>No comments yet. Be the first to comment!</p>
                )}
              </div>
              
              {/* Comment Input */}
              <div className={styles.modalCommentInput}>
                <div className={styles.commentInputContainer}>
                  <div className={styles.commentAvatar}>
                    {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment()
                      }
                    }}
                    className={styles.commentInput}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className={styles.commentSubmitBtn}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
