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
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount, sendPostLikeNotification, sendCommentNotification, debugNotifications } from '../lib/notificationService'
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
  const [editingComment, setEditingComment] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [showCommentMenu, setShowCommentMenu] = useState(null)
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [replyTextMap, setReplyTextMap] = useState({})
  const [showReplyInput, setShowReplyInput] = useState({})
  const router = useRouter()

  // Play notification sound for new notifications
  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  // Load all user data on login (Facebook-style)
  const loadAllUserData = async (userId) => {
    console.log('🚀 Loading all user data for:', userId)
    
    try {
      // Load all notifications
      console.log('📬 Loading notifications...')
      const notificationsData = await debugNotifications(userId)
      setNotifications(notificationsData)
      
      const unreadNotifications = notificationsData.filter(n => !n.read)
      setUnreadCount(unreadNotifications.length)
      setPreviousUnreadCount(unreadNotifications.length)
      
      console.log('✅ Loaded', notificationsData.length, 'notifications,', unreadNotifications.length, 'unread')
      
      // Load all chats
      console.log('💬 Loading chats...')
      await loadUserChats(userId)
      
      console.log('🎉 All user data loaded successfully!')
      setIsInitialLoad(false)
      
    } catch (error) {
      console.error('❌ Error loading user data:', error)
      setIsInitialLoad(false)
    }
  }

  // Load user chats and count unread messages
  const loadUserChats = async (userId) => {
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId)
      )
      
      const chatsSnapshot = await getDocs(chatsQuery)
      let totalUnreadChats = 0
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data()
        const chatId = chatDoc.id
        
        // Check for unread messages in this chat
        const messagesQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          where('senderId', '!=', userId),
          where('read', '==', false)
        )
        
        const unreadMessages = await getDocs(messagesQuery)
        if (unreadMessages.size > 0) {
          totalUnreadChats++
        }
      }
      
      setUnreadChats(totalUnreadChats)
      console.log('💬 Found', totalUnreadChats, 'chats with unread messages')
      
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  // Force correct chronological order
  const forceCorrectOrder = async () => {
    if (!db) return
    
    try {
      console.log('🔄 Forcing correct chronological order...')
      
      // Get all posts and sort them properly
      const postsSnapshot = await getDocs(collection(db, 'Posts'))
      console.log('📊 Total posts for reordering:', postsSnapshot.docs.length)
      
      const allPosts = postsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          userName: data.userName || data.authorName || data.firstName || 'Anonymous',
          text: data.text || data.content || '',
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          comments: data.comments || []
        }
      })
      
      // Sort with detailed logging
      const sortedPosts = allPosts.sort((a, b) => {
        let aTime = 0
        let bTime = 0
        
        // Get timestamps
        if (a.createdAt?.toDate) {
          aTime = a.createdAt.toDate().getTime()
        } else if (a.createdAt?.toMillis) {
          aTime = a.createdAt.toMillis()
        } else if (a.createdAt?.seconds) {
          aTime = a.createdAt.seconds * 1000
        } else if (a.createdAt) {
          aTime = new Date(a.createdAt).getTime()
        }
        
        if (b.createdAt?.toDate) {
          bTime = b.createdAt.toDate().getTime()
        } else if (b.createdAt?.toMillis) {
          bTime = b.createdAt.toMillis()
        } else if (b.createdAt?.seconds) {
          bTime = b.createdAt.seconds * 1000
        } else if (b.createdAt) {
          bTime = new Date(b.createdAt).getTime()
        }
        
        console.log('Comparing posts:', {
          postA: { 
            id: a.id.substring(0, 8), 
            text: a.text?.substring(0, 30) + '...', 
            time: aTime, 
            date: new Date(aTime).toLocaleDateString() 
          },
          postB: { 
            id: b.id.substring(0, 8), 
            text: b.text?.substring(0, 30) + '...', 
            time: bTime, 
            date: new Date(bTime).toLocaleDateString() 
          },
          result: bTime - aTime > 0 ? 'B is newer (goes first)' : 'A is newer (goes first)'
        })
        
        return bTime - aTime // Newest first
      })
      
      console.log('📅 Final post order (newest to oldest):')
      sortedPosts.forEach((post, index) => {
        const time = post.createdAt?.toDate ? post.createdAt.toDate() : 
                    post.createdAt?.toMillis ? new Date(post.createdAt.toMillis()) :
                    new Date(post.createdAt)
        console.log(`${index + 1}. ${post.text?.substring(0, 40)}... (${time.toLocaleDateString()})`)
      })
      
      setPosts(sortedPosts)
      console.log('✅ Posts reordered correctly!')
      
    } catch (error) {
      console.error('❌ Error forcing correct order:', error)
    }
  }

  // Manual refresh function to load posts directly
  const refreshPosts = async () => {
    if (!db) return
    
    try {
      console.log('🔄 Manually loading posts...')
      const postsSnapshot = await getDocs(collection(db, 'Posts'))
      console.log('📊 Manual query found:', postsSnapshot.docs.length, 'posts')
      
      const fetchedPosts = postsSnapshot.docs.map((doc) => {
        const data = doc.data()
        console.log('📝 Loading post:', doc.id, data)
        return {
          id: doc.id,
          ...data,
          // Ensure we have display fields
          userName: data.userName || data.authorName || data.firstName || 'Anonymous',
          text: data.text || data.content || '',
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          comments: data.comments || []
        }
      }).sort((a, b) => {
        // Sort chronologically - NEWEST FIRST (top of feed)
        let aTime = 0
        let bTime = 0
        
        // Handle different timestamp formats for post A
        if (a.createdAt?.toMillis) {
          aTime = a.createdAt.toMillis()
        } else if (a.createdAt?.seconds) {
          aTime = a.createdAt.seconds * 1000
        } else if (a.createdAt?.toDate) {
          aTime = a.createdAt.toDate().getTime()
        } else if (a.createdAt) {
          aTime = new Date(a.createdAt).getTime()
        }
        
        // Handle different timestamp formats for post B
        if (b.createdAt?.toMillis) {
          bTime = b.createdAt.toMillis()
        } else if (b.createdAt?.seconds) {
          bTime = b.createdAt.seconds * 1000
        } else if (b.createdAt?.toDate) {
          bTime = b.createdAt.toDate().getTime()
        } else if (b.createdAt) {
          bTime = new Date(b.createdAt).getTime()
        }
        
        console.log('Sorting posts:', {
          postA: { id: a.id, time: aTime, date: new Date(aTime) },
          postB: { id: b.id, time: bTime, date: new Date(bTime) }
        })
        
        // Return positive if a is older (b should come first)
        // bTime - aTime: if bTime > aTime, result is positive, b comes first (newer)
        return bTime - aTime // NEWEST FIRST (larger timestamp = newer = top)
      })
      
      setPosts(fetchedPosts)
      console.log('✅ Posts manually loaded and set:', fetchedPosts.length)
      alert(`Successfully loaded ${fetchedPosts.length} posts!`)
      
    } catch (error) {
      console.error('❌ Error manually loading posts:', error)
      alert('Error loading posts: ' + error.message)
    }
  }

  // Debug function to check Firebase data
  const debugFirebase = async () => {
    if (!db) {
      console.log('❌ Database not initialized')
      return
    }
    
    try {
      console.log('🔍 === FIREBASE DEBUG START ===')
      
      // Check Posts collection
      const postsSnapshot = await getDocs(collection(db, 'Posts'))
      console.log('📊 Total posts in Firebase:', postsSnapshot.docs.length)
      
      postsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data()
        console.log(`📝 Post ${index + 1}:`, {
          id: doc.id,
          text: data.text || data.content || 'No text',
          author: data.userName || data.authorName || data.firstName || 'No author',
          createdAt: data.createdAt,
          likes: data.likes || 0
        })
      })
      
      // Check current posts state
      console.log('📱 Posts in React state:', posts.length)
      console.log('👤 Current user:', user?.firstName, user?.email)
      
      console.log('🔍 === FIREBASE DEBUG END ===')
      
      // Show alert with results
      alert(`Firebase Debug Results:\n\nPosts in database: ${postsSnapshot.docs.length}\nPosts in UI: ${posts.length}\n\nCheck console for detailed info.`)
      
    } catch (error) {
      console.error('❌ Error debugging Firebase:', error)
      alert('Error accessing Firebase. Check console for details.')
    }
  }

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
        if (showNotifications) {
          setShowNotifications(false)
        }
        if (showChat) {
          setShowChat(false)
        }
        if (showProfileMenu) {
          setShowProfileMenu(false)
        }
        if (showMobileSearch) {
          setShowMobileSearch(false)
        }
        if (showCommentMenu) {
          setShowCommentMenu(null)
        }
        if (editingComment) {
          setEditingComment(null)
          setEditCommentText('')
        }
      }
    }

    const handleClickOutside = (event) => {
      // Close dropdowns when clicking outside
      if (!event.target.closest('.dropdown-container')) {
        setShowDropdown(null)
        setShowNotifications(false)
        setShowChat(false)
        setShowProfileMenu(false)
        setShowMobileSearch(false)
      }
      // Close comment menu when clicking outside
      if (!event.target.closest('.comment-menu-container')) {
        setShowCommentMenu(null)
      }
    }

    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showCommentModal, showDropdown, showNotifications, showChat, showProfileMenu, showMobileSearch, showCommentMenu, editingComment])

  // Update selectedPost when posts change (for real-time comments)
  useEffect(() => {
    if (selectedPost && posts.length > 0) {
      const updatedPost = posts.find(p => p.id === selectedPost.id)
      if (updatedPost) {
        setSelectedPost(updatedPost)
      }
    }
  }, [posts, selectedPost])

  // Listen for auth state changes and real-time posts
  useEffect(() => {
    if (!auth || !db) return // Wait for Firebase to initialize

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log('🔐 User authenticated:', currentUser.uid)
        setUser(currentUser)
        
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            console.log('👤 User role:', userData.role)
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

        // Load all user data (Facebook-style)
        await loadAllUserData(currentUser.uid)
        
      } else {
        console.log('🚪 User not authenticated')
        setUser(null)
        setUserRole(null)
        setNotifications([])
        setUnreadCount(0)
        setUnreadChats(0)
        setIsInitialLoad(true)
      }
    })

    // Real-time posts listener with proper ordering
    console.log('🔄 Setting up posts listener with orderBy...')
    
    let unsubscribePosts = null
    
    // Try the ordered query first (this should work for proper chronological order)
    try {
      const q = query(collection(db, 'Posts'), orderBy('createdAt', 'desc'))
      unsubscribePosts = onSnapshot(q, 
        (snapshot) => {
          console.log('📊 Ordered posts snapshot received:', snapshot.docs.length, 'documents')
          
          const fetchedPosts = snapshot.docs.map((doc) => {
            const data = doc.data()
            console.log('📝 Post data (ordered):', {
              id: doc.id,
              text: data.text?.substring(0, 50) + '...',
              createdAt: data.createdAt,
              timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            })
            return {
              id: doc.id,
              ...data,
            }
          })
          
          console.log('✅ Ordered posts set in state:', fetchedPosts.length)
          setPosts(fetchedPosts)
        },
        (error) => {
          console.error('❌ Error loading posts:', error)
          console.log('🔄 Trying fallback query without orderBy...')
          
          // Fallback: Try without orderBy in case of index issues
          unsubscribePosts = onSnapshot(
            collection(db, 'Posts'),
            (snapshot) => {
              console.log('📊 Fallback query - Posts found:', snapshot.docs.length)
              const fetchedPosts = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })).sort((a, b) => {
                // Sort chronologically - NEWEST FIRST (top of feed)
                let aTime = 0
                let bTime = 0
                
                // Handle different timestamp formats for post A
                if (a.createdAt?.toMillis) {
                  aTime = a.createdAt.toMillis()
                } else if (a.createdAt?.seconds) {
                  aTime = a.createdAt.seconds * 1000
                } else if (a.createdAt?.toDate) {
                  aTime = a.createdAt.toDate().getTime()
                } else if (a.createdAt) {
                  aTime = new Date(a.createdAt).getTime()
                }
                
                // Handle different timestamp formats for post B
                if (b.createdAt?.toMillis) {
                  bTime = b.createdAt.toMillis()
                } else if (b.createdAt?.seconds) {
                  bTime = b.createdAt.seconds * 1000
                } else if (b.createdAt?.toDate) {
                  bTime = b.createdAt.toDate().getTime()
                } else if (b.createdAt) {
                  bTime = new Date(b.createdAt).getTime()
                }
                
                return bTime - aTime // NEWEST FIRST
              })
              console.log('✅ Fallback posts set:', fetchedPosts.length)
              setPosts(fetchedPosts)
            }
          )
        }
      )
    } catch (setupError) {
      console.error('❌ Error setting up posts listener:', setupError)
      // Call the force correct order function as fallback
      forceCorrectOrder()
    }
    
    // Also call force correct order after a short delay to ensure proper synchronization
    setTimeout(() => {
      forceCorrectOrder()
    }, 2000)

    // Listen to notifications when user is authenticated
    let unsubscribeNotifications = null
    if (user) {
      console.log('Starting notification listener for user:', user.uid)
      unsubscribeNotifications = listenToNotifications(user.uid, (notificationsList) => {
        console.log('Dashboard received notifications update:', notificationsList.length, 'notifications')
        setNotifications(notificationsList)
        const unreadNotifications = notificationsList.filter(n => !n.read)
        const newUnreadCount = unreadNotifications.length
        
        // Play sound and show visual feedback for new notifications
        if (newUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
          console.log('🔔 New notification received! Playing sound...')
          playNotificationSound()
        }
        
        setUnreadCount(newUnreadCount)
        setPreviousUnreadCount(newUnreadCount)
        console.log('Updated unread count to:', newUnreadCount)
      })
    }

    return () => {
      unsubscribeAuth()
      if (unsubscribePosts) {
        unsubscribePosts()
      }
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
        
        // Send notification to post owner
        if (post.userId && post.userId !== user.uid) {
          console.log('Sending like notification for post:', post.id, 'to user:', post.userId)
          console.log('Current user data for notification:', {
            uid: user.uid,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
            email: user.email
          })
          
          // Get the full user name - try multiple sources
          let userName = ''
          if (user.firstName) {
            userName = `${user.firstName} ${user.lastName || ''}`.trim()
          } else if (user.displayName) {
            userName = user.displayName
          } else if (user.email) {
            userName = user.email.split('@')[0] // Use email username as fallback
          } else {
            userName = 'AgriLink User'
          }
          
          console.log('Using username for notification:', userName)
          
          await sendPostLikeNotification(
            post.id,
            post.userId,
            user.uid,
            userName
          )
        } else {
          console.log('Not sending like notification - same user or missing userId')
        }
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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`
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
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: commentText.trim(),
        userName: user.firstName + ' ' + (user.lastName || ''),
        userEmail: user.email,
        userId: user.uid,
        createdAt: new Date()
      }

      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      })

      // Send notification to post owner
      if (selectedPost.userId && selectedPost.userId !== user.uid) {
        console.log('Sending comment notification for post:', selectedPost.id, 'to user:', selectedPost.userId)
        console.log('Current user data for comment notification:', {
          uid: user.uid,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          email: user.email
        })
        
        // Get the full user name - try multiple sources
        let userName = ''
        if (user.firstName) {
          userName = `${user.firstName} ${user.lastName || ''}`.trim()
        } else if (user.displayName) {
          userName = user.displayName
        } else if (user.email) {
          userName = user.email.split('@')[0] // Use email username as fallback
        } else {
          userName = 'AgriLink User'
        }
        
        console.log('Using username for comment notification:', userName)
        
        await sendCommentNotification(
          selectedPost.id,
          selectedPost.userId,
          user.uid,
          userName,
          commentText.trim()
        )
      } else {
        console.log('Not sending comment notification - same user or missing userId')
      }

      // Update selectedPost immediately for real-time feel
      setSelectedPost(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }))

      setCommentText('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }
  const toggleReplyInput = (targetId) => {
    const isCurrentlyOpen = showReplyInput[targetId]
    
    setShowReplyInput(prev => ({
      ...prev,
      [targetId]: !prev[targetId]
    }))
    
    if (!isCurrentlyOpen) {
      // Opening reply input - auto-mention the target user
      let targetUserName = null
      
      // Check if it's a direct comment reply
      const comment = selectedPost?.comments?.find(c => (c.id || c.commentId) === targetId)
      if (comment && comment.userName) {
        targetUserName = comment.userName
      } else {
        // Check if it's a reply to a reply
        for (const comment of selectedPost?.comments || []) {
          const reply = comment.replies?.find(r => r.id === targetId)
          if (reply && reply.userName) {
            targetUserName = reply.userName
            break
          }
        }
      }
      
      if (targetUserName) {
        const mention = `@${targetUserName} `
        setReplyTextMap(prev => ({ 
          ...prev, 
          [targetId]: mention 
        }))
      }
    } else {
      // Closing reply input - clear the text
      setReplyTextMap(prev => ({ 
        ...prev, 
        [targetId]: '' 
      }))
    }
  }
  const handleAddReply = async (parentCommentId, replyToReplyId = null) => {
    const targetId = replyToReplyId || parentCommentId
    const text = replyTextMap[targetId]?.trim()
    if (!text || !user || !selectedPost) return

    try {
      const postRef = doc(db, 'Posts', selectedPost.id)
      
      // Process the text to format mentions (remove @ and make name bold)
      let processedText = text
      // Find @mentions at the beginning or after a space, followed by a space or end of string
      processedText = processedText.replace(/(^|[\s])@([A-Za-z]+(?:\s+[A-Za-z]+)*)([\s]|$)/g, '$1<strong>$2</strong>$3')
      
      const newReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: processedText,
        userName: user.firstName + ' ' + (user.lastName || ''),
        userEmail: user.email,
        userId: user.uid,
        createdAt: new Date(),
        parentId: parentCommentId,
        replyToReplyId: replyToReplyId // Track if this is a reply to another reply
      }

      const updatedComments = (selectedPost.comments || []).map(c => {
        const cid = c.id || c.commentId
        if (cid === parentCommentId) {
          const replies = c.replies ? [...c.replies, newReply] : [newReply]
          return { ...c, replies }
        }
        return c
      })

      await updateDoc(postRef, { comments: updatedComments })

      setSelectedPost(prev => ({ ...prev, comments: updatedComments }))
      setReplyTextMap(prev => ({ ...prev, [targetId]: '' }))
      setShowReplyInput(prev => ({ ...prev, [targetId]: false }))
    } catch (error) {
      console.error('Error adding reply:', error)
    }
  }

  // Migration function to update existing comments with proper structure
  const migrateCommentsStructure = async () => {
    if (!db || !user) return

    try {
      console.log('🔄 Starting comment structure migration...')
      const postsSnapshot = await getDocs(collection(db, 'Posts'))
      let updatedPostsCount = 0

      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data()
        if (postData.comments && postData.comments.length > 0) {
          let needsUpdate = false
          const updatedComments = postData.comments.map((comment, index) => {
            // Check if comment needs migration (missing id or userId)
            if (!comment.id || !comment.userId) {
              needsUpdate = true
              return {
                ...comment,
                id: comment.id || `migrated-${Date.now()}-${index}`,
                userId: comment.userId || 'unknown',
                createdAt: comment.createdAt || new Date().toISOString()
              }
            }
            return comment
          })

          if (needsUpdate) {
            await updateDoc(doc(db, 'Posts', postDoc.id), {
              comments: updatedComments
            })
            updatedPostsCount++
            console.log(`✅ Updated post ${postDoc.id} with ${updatedComments.length} comments`)
          }
        }
      }

      console.log(`🎉 Migration complete! Updated ${updatedPostsCount} posts`)
      if (updatedPostsCount > 0) {
        alert(`Successfully migrated ${updatedPostsCount} posts with updated comment structure!`)
        // Refresh posts to show updated data
        await refreshPosts()
      } else {
        alert('No posts needed migration. All comments are already properly structured!')
      }
    } catch (error) {
      console.error('❌ Error during migration:', error)
      alert('Migration failed. Please try again.')
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

  // Comment management functions
  const handleEditComment = (comment) => {
    console.log('Edit comment called for:', comment)
    setEditingComment(comment.id)
    setEditCommentText(comment.text)
    setShowCommentMenu(null) // Close the dropdown
    
    // Auto-scroll to the comment being edited
    setTimeout(() => {
      const commentElement = document.querySelector(`[data-comment-id="${comment.id}"]`)
      if (commentElement) {
        commentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }
    }, 100) // Small delay to ensure the edit interface has rendered
  }

  const handleReportComment = async (commentId) => {
    console.log('Report comment called for:', commentId)
    
    // Find the comment and post
    let targetComment = null
    let targetPost = null
    
    for (const post of posts) {
      if (post.comments) {
        const comment = post.comments.find(c => c.id === commentId)
        if (comment) {
          targetComment = comment
          targetPost = post
          break
        }
      }
    }
    
    if (!targetComment || !targetPost) {
      alert('Comment not found')
      return
    }

    const reason = prompt('Please select a reason for reporting this comment:\n\n1. Spam\n2. Inappropriate Content\n3. Harassment\n4. False Information\n\nEnter the number (1-4):')
    
    if (!reason || !['1', '2', '3', '4'].includes(reason)) {
      setShowCommentMenu(null)
      return
    }

    const reasonMap = {
      '1': { key: 'spam', desc: 'This comment appears to be spam' },
      '2': { key: 'inappropriate', desc: 'This comment contains inappropriate content' },
      '3': { key: 'harassment', desc: 'This comment contains harassment or bullying' },
      '4': { key: 'misinformation', desc: 'This comment contains false or misleading information' }
    }

    const selectedReason = reasonMap[reason]

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        alert('You must be logged in to report comments')
        return
      }

      const reportData = {
        commentId: commentId,
        postId: targetPost.id,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || 'Anonymous',
        reporterEmail: currentUser.email || '',
        reason: selectedReason.key,
        description: selectedReason.desc,
        commentContent: targetComment.text || '',
        commentAuthor: targetComment.userName || targetComment.userEmail || 'Unknown'
      }

      const response = await fetch('http://192.168.1.15:3000/report-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      const data = await response.json()

      if (data.success) {
        alert('Report submitted successfully. Our AI system will review it shortly and take appropriate action if needed.')
      } else {
        alert('Error: ' + (data.error || 'Failed to submit report. Please try again.'))
      }
    } catch (error) {
      console.error('Error submitting comment report:', error)
      alert('Network error. Please check your connection and try again.')
    }
    
    setShowCommentMenu(null)
  }

  const handleDeleteComment = async (commentId) => {
    console.log('Delete comment called for:', commentId)
    console.log('Available posts:', posts.map(p => ({ id: p.id, commentsCount: p.comments?.length })))
    console.log('Selected post:', selectedPost?.id)
    
    // Find the post that contains this comment
    const targetPost = selectedPost || posts.find(post => 
      post.comments && post.comments.some(comment => comment.id === commentId)
    )
    
    if (!targetPost) {
      console.error('Could not find post containing comment with ID:', commentId)
      alert('Error: Could not find the post containing this comment. Please refresh the page and try again.')
      return
    }

    console.log('Target post found:', targetPost.id, 'Comments:', targetPost.comments?.length)

    // Find the specific comment to check ownership
    const commentToDelete = targetPost.comments.find(comment => comment.id === commentId)
    
    if (!commentToDelete) {
      console.error('Could not find comment with ID:', commentId, 'in post:', targetPost.id)
      alert('Error: Could not find this comment. It may have already been deleted.')
      return
    }

    console.log('Comment to delete:', commentToDelete)

    const isOwnComment = commentToDelete && (
      commentToDelete.userId === user?.uid || 
      (!commentToDelete.userId && commentToDelete.userEmail === user?.email)
    )

    // Different confirmation messages for own vs other's comments
    const confirmMessage = isOwnComment 
      ? 'Are you sure you want to delete this comment?' 
      : `Are you sure you want to delete ${commentToDelete?.userName || 'this user'}'s comment? This action cannot be undone.`
    
    const confirmDelete = window.confirm(confirmMessage)
    if (!confirmDelete) return

    try {
      console.log('Attempting to delete comment from Firebase...')
      const postRef = doc(db, 'Posts', targetPost.id)
      
      // Filter out the comment by ID, handling both string and object IDs
      const updatedComments = targetPost.comments.filter(comment => {
        const commentIdToCheck = comment.id || comment.commentId || `${comment.text}-${comment.createdAt}`
        return commentIdToCheck !== commentId
      })
      
      console.log('Original comments count:', targetPost.comments.length)
      console.log('Updated comments count:', updatedComments.length)
      
      await updateDoc(postRef, {
        comments: updatedComments
      })

      setShowCommentMenu(null) // Close the dropdown
      console.log('Comment deleted successfully from Firebase')
      
      // Update selectedPost if it's the current post
      if (selectedPost && selectedPost.id === targetPost.id) {
        setSelectedPost(prev => ({ ...prev, comments: updatedComments }))
      }
      
      // Show success message
      alert(`Comment ${isOwnComment ? '' : `by ${commentToDelete?.userName || 'user'} `}has been deleted successfully.`)
      
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert(`Failed to delete comment: ${error.message}. Please try again.`)
    }
  }

  const handleSaveCommentEdit = async () => {
    if (!editCommentText.trim() || !user) return

    // Find the post that contains the comment being edited
    const targetPost = selectedPost || posts.find(post => 
      post.comments?.some(comment => comment.id === editingComment)
    )
    
    if (!targetPost) return

    try {
      const postRef = doc(db, 'Posts', targetPost.id)
      const currentPost = posts.find(p => p.id === targetPost.id)
      const updatedComments = currentPost.comments.map(comment => 
        comment.id === editingComment 
          ? { ...comment, text: editCommentText.trim(), editedAt: new Date().toISOString() }
          : comment
      )

      await updateDoc(postRef, {
        comments: updatedComments
      })

      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === targetPost.id 
            ? { ...post, comments: updatedComments }
            : post
        )
      )
      
      // Update selected post if in modal
      if (selectedPost && selectedPost.id === targetPost.id) {
        setSelectedPost(prev => ({ ...prev, comments: updatedComments }))
      }
      
      setEditingComment(null)
      setEditCommentText('')
      alert('Comment updated successfully!')
    } catch (error) {
      console.error('Error editing comment:', error)
      alert('Failed to edit comment. Please try again.')
    }
  }

  // Reply handlers
  const handleEditReply = (reply, parentCommentId) => {
    console.log('Edit reply:', reply, 'for comment:', parentCommentId)
    // TODO: Implement reply editing functionality
    setShowCommentMenu(null)
    alert('Reply editing feature coming soon!')
  }

  const handleDeleteReply = async (replyId, parentCommentId) => {
    if (!user || !selectedPost) return

    try {
      const postRef = doc(db, 'Posts', selectedPost.id)
      
      // Find and update the parent comment to remove the reply
      const updatedComments = selectedPost.comments.map(comment => {
        const commentIdToCheck = comment.id || comment.commentId
        if (commentIdToCheck === parentCommentId && comment.replies) {
          const updatedReplies = comment.replies.filter(reply => {
            const replyIdToCheck = reply.id || `reply-${reply.text}-${reply.createdAt}`
            return replyIdToCheck !== replyId
          })
          return { ...comment, replies: updatedReplies }
        }
        return comment
      })

      await updateDoc(postRef, { comments: updatedComments })
      setSelectedPost(prev => ({ ...prev, comments: updatedComments }))
      setShowCommentMenu(null)
      alert('Reply deleted successfully!')
      
    } catch (error) {
      console.error('Error deleting reply:', error)
      alert('Failed to delete reply. Please try again.')
    }
  }

  const handleReportReply = async (replyId) => {
    const reason = prompt('Please select a reason for reporting this reply:\n\n1. Spam\n2. Inappropriate Content\n3. Harassment\n4. False Information\n\nEnter the number (1-4):')
    
    if (!reason || !['1', '2', '3', '4'].includes(reason)) {
      setShowCommentMenu(null)
      return
    }

    const reasons = {
      '1': 'Spam',
      '2': 'Inappropriate Content', 
      '3': 'Harassment',
      '4': 'False Information'
    }

    try {
      await addDoc(collection(db, 'reports'), {
        type: 'reply',
        replyId: replyId,
        postId: selectedPost?.id,
        reportedBy: user.uid,
        reporterName: user.firstName + ' ' + (user.lastName || ''),
        reporterEmail: user.email,
        reason: reasons[reason],
        createdAt: serverTimestamp()
      })

      setShowCommentMenu(null)
      alert('Reply reported successfully. Thank you for helping keep our community safe.')
    } catch (error) {
      console.error('Error reporting reply:', error)
      alert('Failed to report reply. Please try again.')
    }
  }

  const handleReportPost = async (postId) => {
    const targetPost = posts.find(post => post.id === postId)
    if (!targetPost) {
      alert('Post not found')
      return
    }

    const reason = prompt('Please select a reason for reporting this post:\n\n1. Spam\n2. Inappropriate Content\n3. Harassment\n4. False Information\n\nEnter the number (1-4):')
    
    if (!reason || !['1', '2', '3', '4'].includes(reason)) {
      setShowDropdown(null)
      return
    }

    const reasonMap = {
      '1': { key: 'spam', desc: 'This post appears to be spam' },
      '2': { key: 'inappropriate', desc: 'This post contains inappropriate content' },
      '3': { key: 'harassment', desc: 'This post contains harassment or bullying' },
      '4': { key: 'misinformation', desc: 'This post contains false or misleading information' }
    }

    const selectedReason = reasonMap[reason]

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        alert('You must be logged in to report posts')
        return
      }

      const reportData = {
        postId: postId,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || 'Anonymous',
        reporterEmail: currentUser.email || '',
        reason: selectedReason.key,
        description: selectedReason.desc,
        postContent: targetPost.text || '',
        postAuthor: targetPost.userName || targetPost.userEmail || 'Unknown'
      }

      const response = await fetch('http://192.168.1.15:3000/report-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      const data = await response.json()

      if (data.success) {
        alert('Report submitted successfully. Our AI system will review it shortly and take appropriate action if needed.')
      } else {
        alert('Error: ' + (data.error || 'Failed to submit report. Please try again.'))
      }
    } catch (error) {
      console.error('Error submitting post report:', error)
      alert('Network error. Please check your connection and try again.')
    }
    
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


  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification)
    setShowNotifications(false)
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'post_like':
      case 'post_comment':
        // Find and open the post in comment modal
        if (notification.postId) {
          console.log('Looking for post with ID:', notification.postId)
          const post = posts.find(p => p.id === notification.postId)
          if (post) {
            console.log('Found post in current posts, opening modal')
            setSelectedPost(post)
            setShowCommentModal(true)
          } else {
            // If post not in current posts, fetch it
            console.log('Post not found in current posts, fetching from database')
            try {
              const postDoc = await getDoc(doc(db, 'Posts', notification.postId))
              if (postDoc.exists()) {
                const postData = { id: postDoc.id, ...postDoc.data() }
                console.log('Fetched post from database:', postData)
                setSelectedPost(postData)
                setShowCommentModal(true)
              } else {
                console.log('Post not found in database')
              }
            } catch (error) {
              console.error('Error fetching post:', error)
            }
          }
        } else {
          console.log('No postId in notification')
        }
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
                    <div className={styles.notificationAvatar}>
                      {notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName[0].toUpperCase() : 'A'}
                    </div>
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationHeader}>
                        <span className={styles.notificationUserName}>
                          {notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'AgriLink User'}
                        </span>
                        <span className={styles.notificationAction}>
                          {notification.actionText || (notification.actionType === 'like' ? 'liked your post' : 'commented on your post')}
                        </span>
                      </div>
                      {notification.actionType === 'comment' && notification.commentPreview && (
                        <p className={styles.notificationCommentPreview}>
                          "{notification.commentPreview}..."
                        </p>
                      )}
                      <span className={styles.notificationTime}>
                        {notification.createdAt ? new Date(notification.createdAt.toDate()).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div className={styles.notificationIcon}>
                      {notification.actionType === 'like' ? '❤️' : '💬'}
                    </div>
                    {!notification.read && <div className={styles.unreadDot}></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      <div className={styles.mainLayout}>
        {/* Left Container - Top Layer */}
        <aside className={styles.leftContainer}>
          <div className={styles.leftContainerContent}>
            {/* AgriLink Logo */}
            <div className={styles.leftLogoContainer}>
              <img src="/assets/images/AgrilinkLogo.png" alt="AgriLink Logo" className={styles.leftLogo} />
            </div>
            
            {/* Menu Items */}
            <div className={styles.leftMenuList}>
              <div className={styles.leftMenuItem} onClick={() => {
                // Navigate to home/dashboard
                console.log('Home clicked')
              }}>
                <img src="/assets/icons/home.png" alt="Home" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Home</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => {
                // Handle search functionality when implemented
                console.log('Search clicked')
              }}>
                <img src="/assets/icons/search.png" alt="Search" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Search</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => router.push('/listings')}>
                <img src="/assets/icons/shopping-cart.png" alt="Listings" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Listings</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => {
                // Navigate to transaction history when implemented
                console.log('Transaction History clicked')
              }}>
                <img src="/assets/icons/time-past.png" alt="Transaction History" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Transaction History</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => {
                // Handle notifications
                console.log('Notifications clicked')
                setShowNotifications(!showNotifications)
              }}>
                <img src="/assets/icons/bell.png" alt="Notifications" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Notifications</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => {
                // Navigate to profile page when implemented
                console.log('Profile clicked')
              }}>
                <div className={styles.leftProfileAvatar}>
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className={styles.leftMenuText}>Profile</span>
              </div>
              
            </div>
            
            {/* Menu Button at Bottom */}
            <div className={styles.leftMenuBottom}>
              <div className={styles.leftMenuItem} onClick={() => {
                // Handle menu toggle
                console.log('Menu clicked')
              }}>
                <img src="/assets/icons/hamburger.png" alt="Menu" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Menu</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Floating Messages Button */}
        <div className={styles.floatingMessages}>
          <div 
            className={styles.messagesButton}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowChat(!showChat)
            }}
          >
            <img src="/assets/icons/message.png" alt="Messages" className={styles.messageIcon} />
            <span className={styles.messageText}>Messages</span>
            {unreadChats > 0 && (
              <span className={styles.messageBadge}>
                {unreadChats > 99 ? '99+' : unreadChats}
              </span>
            )}
          </div>
          
          {/* Chat Popup */}
          {showChat && (
            <div className={styles.chatPopup}>
              <div className={styles.chatPopupHeader}>
                <h3 className={styles.chatPopupTitle}>Chats</h3>
                <button 
                  className={styles.chatPopupCloseBtn}
                  onClick={() => setShowChat(false)}
                >
                  ✕
                </button>
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
        </div>

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
                  <div className={`${styles.postOptions} dropdown-container`}>
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
                    <p 
                      style={{ whiteSpace: 'pre-wrap', cursor: 'pointer' }}
                      onClick={() => openCommentModal(post)}
                    >
                      {post.text}
                    </p>
                  )}
                  {post.imageUrl && (
                    <img 
                      src={post.imageUrl} 
                      alt="Post image" 
                      className={styles.postImage}
                      onClick={() => openCommentModal(post)}
                      style={{ cursor: 'pointer' }}
                    />
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
                <span>{selectedPost?.likes || 0} likes</span>
                <span>{selectedPost?.comments?.length || 0} comments</span>
              </div>
              {/* Like Button */}
              <div className={styles.modalPostActions}>
                <button 
                  className={`${styles.modalActionBtn} ${hasUserLiked(selectedPost) ? styles.liked : ''}`}
                  onClick={() => handleLikePost(selectedPost)}
                >
                  <img 
                    src={hasUserLiked(selectedPost) ? "/assets/icons/red-heart.png" : "/assets/icons/heart.png"} 
                    alt="Like" 
                    className={styles.actionIcon} 
                  />
                  Like
                </button>
              </div>
              {/* Comments List */}
              <div className={styles.modalCommentsSection}>
                {selectedPost.comments && selectedPost.comments.length > 0 ? (
                  selectedPost.comments.map((comment, index) => {
                    const commentId = comment.id || comment.commentId || `comment-${index}-${comment.text?.substring(0, 10)}`
                    return (
                      <div key={commentId} className={styles.modalComment} data-comment-id={commentId}>
                        <div className={styles.commentAvatar}>
                          {comment.userName ? comment.userName[0].toUpperCase() : 'U'}
                        </div>
                        <div className={styles.commentContent}>
                          {editingComment === commentId ? (
                            <div className={styles.editCommentContainer}>
                              <textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className={styles.editCommentInput}
                                rows="3"
                              />
                              <div className={styles.editCommentButtons}>
                                <button 
                                  onClick={handleSaveCommentEdit}
                                  className={styles.saveCommentBtn}
                                  disabled={!editCommentText.trim() || editCommentText.trim() === comment.text}
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingComment(null)
                                    setEditCommentText('')
                                  }}
                                  className={styles.cancelCommentBtn}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.commentBubbleWrapper}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                {/* Left: bubble + reply controls */}
                                <div style={{ display: 'inline-block' }}>
                                  <div className={styles.commentBubble}>
                                    <span className={styles.commentAuthor}>{comment.userName}</span>
                                    <p className={styles.commentText}>
                                      {comment.text}
                                      {comment.editedAt && <span className={styles.editedIndicator}> (edited)</span>}
                                    </p>
                                  </div>
                                  {/* Reply button with timestamp on the left */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 2, width: '100%' }}>
                                    <span className={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</span>
                                    <button
                                      onClick={() => toggleReplyInput(commentId)}
                                      className={styles.commentMenuItem}
                                      style={{ 
                                        padding: 0, 
                                        background: 'transparent', 
                                        fontSize: '12px',
                                        textDecoration: 'none',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                  {showReplyInput[commentId] && (
                                    <div className={styles.replyGroup}>
                                      <div className={styles.replyInputRow}>
                                        <input
                                          type="text"
                                          placeholder={`Reply to ${comment.userName}...`}
                                          value={replyTextMap[commentId] || ''}
                                          onChange={(e) => setReplyTextMap(prev => ({ ...prev, [commentId]: e.target.value }))}
                                          onKeyPress={(e) => { if (e.key === 'Enter') { handleAddReply(commentId) } }}
                                          className={styles.commentInput}
                                          style={{ flex: 1 }}
                                        />
                                        <button
                                          onClick={() => handleAddReply(commentId)}
                                          disabled={!((replyTextMap[commentId] || '').trim())}
                                          className={styles.commentSubmitBtn}
                                        >
                                          Post
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Replies section - directly under the comment */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div style={{ marginTop: 8, marginLeft: 40, display: 'grid', gap: 8, justifyItems: 'start' }}>
                                      {comment.replies.map((reply, rIdx) => {
                                        const replyId = reply.id || `reply-${rIdx}`
                                        return (
                                          <div key={replyId} className={styles.modalComment} data-reply-id={replyId}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                              {/* Left: reply bubble + reply controls */}
                                              <div style={{ display: 'inline-block' }}>
                                                <div className={styles.commentAvatar}>
                                                  {reply.userName ? reply.userName[0].toUpperCase() : 'U'}
                                                </div>
                                                <div className={styles.commentContent}>
                                                  <div className={styles.commentBubble}>
                                                    <span className={styles.commentAuthor}>{reply.userName}</span>
                                                    <p className={styles.commentText} dangerouslySetInnerHTML={{ __html: reply.text }}></p>
                                                  </div>
                                                  {/* Reply button with timestamp */}
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 2, width: '100%' }}>
                                                    <span className={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</span>
                                                    <button
                                                      onClick={() => toggleReplyInput(replyId)}
                                                      className={styles.commentMenuItem}
                                                      style={{ 
                                                        padding: 0, 
                                                        background: 'transparent', 
                                                        fontSize: '12px',
                                                        textDecoration: 'none',
                                                        cursor: 'pointer'
                                                      }}
                                                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                    >
                                                      Reply
                                                    </button>
                                                  </div>
                                                  {showReplyInput[replyId] && (
                                                    <div className={styles.replyGroup}>
                                                      <div className={styles.replyInputRow}>
                                                        <input
                                                          type="text"
                                                          placeholder={`Reply to ${reply.userName}...`}
                                                          value={replyTextMap[replyId] || ''}
                                                          onChange={(e) => setReplyTextMap(prev => ({ ...prev, [replyId]: e.target.value }))}
                                                          onKeyPress={(e) => { if (e.key === 'Enter') { handleAddReply(commentId, replyId) } }}
                                                          className={styles.commentInput}
                                                          style={{ flex: 1 }}
                                                        />
                                                        <button
                                                          onClick={() => handleAddReply(commentId, replyId)}
                                                          disabled={!((replyTextMap[replyId] || '').trim())}
                                                          className={styles.commentSubmitBtn}
                                                        >
                                                          Post
                                                        </button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Right: menu */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className={`${styles.commentMenuContainer} comment-menu-container ${showCommentMenu === replyId ? styles.menuOpen : ''}`}>
                                                  <button 
                                                    className={styles.commentMenuBtn}
                                                    onClick={(e) => {
                                                      e.preventDefault()
                                                      e.stopPropagation()
                                                      setShowCommentMenu(showCommentMenu === replyId ? null : replyId)
                                                    }}
                                                  >
                                                    ⋯
                                                  </button>
                                                  {showCommentMenu === replyId && (
                                                    <div className={styles.commentDropdown}>
                                                      {(reply.userId === user?.uid || (!reply.userId && reply.userEmail === user?.email)) ? (
                                                        <>
                                                          <button onClick={() => handleEditReply(reply, commentId)} className={styles.commentMenuItem}>Edit</button>
                                                          <button onClick={() => handleDeleteReply(replyId, commentId)} className={`${styles.commentMenuItem} ${styles.deleteMenuItem}`}>Delete</button>
                                                        </>
                                                      ) : (
                                                        <button onClick={() => handleReportReply(replyId)} className={`${styles.commentMenuItem} ${styles.reportMenuItem}`}>Report</button>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                                {/* Right: menu only */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className={`${styles.commentMenuContainer} comment-menu-container ${showCommentMenu === commentId ? styles.menuOpen : ''}`}>
                                    <button 
                                      className={styles.commentMenuBtn}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setShowCommentMenu(showCommentMenu === commentId ? null : commentId)
                                        if (showCommentMenu !== commentId) {
                                          setTimeout(() => {
                                            const dropdown = document.querySelector(`[data-comment-id="${commentId}"] .${styles.commentDropdown}`)
                                            if (dropdown) {
                                              const buttonRect = e.target.getBoundingClientRect()
                                              dropdown.style.left = `${buttonRect.right + 4}px`
                                              dropdown.style.top = `${buttonRect.top}px`
                                            }
                                          }, 10)
                                        }
                                      }}
                                    >
                                      ⋯
                                    </button>
                                    {showCommentMenu === commentId && (
                                      <div className={styles.commentDropdown}>
                                        {(comment.userId === user?.uid || (!comment.userId && comment.userEmail === user?.email)) ? (
                                          <>
                                            <button onClick={() => handleEditComment(comment)} className={styles.commentMenuItem}>Edit</button>
                                            <button onClick={() => handleDeleteComment(commentId)} className={`${styles.commentMenuItem} ${styles.deleteMenuItem}`}>Delete</button>
                                          </>
                                        ) : (
                                          <button onClick={() => handleReportComment(commentId)} className={`${styles.commentMenuItem} ${styles.reportMenuItem}`}>Report</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
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
