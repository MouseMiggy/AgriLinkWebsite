import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import Listings from './listings'
import RequestListingHistory from './request-listing-history'
import ListingHistory from './listing-history'
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
import styles from '../../styles/modules/dashboard.module.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [postText, setPostText] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editImagePreviews, setEditImagePreviews] = useState([])
  const [editLoading, setEditLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [showDropdown, setShowDropdown] = useState(null)
  const [conversations, setConversations] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState({})
  const [showPostModal, setShowPostModal] = useState(false)
  const [showAllComments, setShowAllComments] = useState({})
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
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
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState('home')
  const [showMessageMenu, setShowMessageMenu] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [menuButtonRef, setMenuButtonRef] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportedPost, setReportedPost] = useState(null)
  const [reportEvidence, setReportEvidence] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportImageIndex, setReportImageIndex] = useState(0)
  const [userReports, setUserReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsFilter, setReportsFilter] = useState('all')
  const dropdownRef = useRef(null)
  const markAsReadTimeoutRef = useRef(null)
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
          document.body.style.overflow = 'auto'
        }
        if (showChat) {
          setShowChat(false)
          setSelectedChat(null)
          setChatMessages([])
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
        if (showMenuDropdown) {
          setShowMenuDropdown(false)
        }
        if (showMessageMenu) {
          setShowMessageMenu(null)
        }
        if (showEditModal) {
          closeEditModal()
        }
      }
    }

    const handleClickOutside = (event) => {
      // Check if click is inside chat popup or messages button
      const isInsideChatPopup = event.target.closest(`.${styles.chatPopup}`)
      const isInsideMessagesButton = event.target.closest(`.${styles.messagesButton}`)
      const isInsideFloatingMessages = event.target.closest(`.${styles.floatingMessages}`)
      
      // Close dropdowns when clicking outside
      if (!isInsideChatPopup && !isInsideMessagesButton && !isInsideFloatingMessages && !event.target.closest('.dropdown-container') && !event.target.closest('.menu-dropdown-container')) {
        setShowDropdown(null)
        if (showNotifications) {
          setShowNotifications(false)
          document.body.style.overflow = 'auto'
        }
        if (showChat) {
          setShowChat(false)
          setSelectedChat(null)
          setChatMessages([])
        }
        setShowProfileMenu(false)
        setShowMobileSearch(false)
        setShowMenuDropdown(false)
      }
      // Close comment menu when clicking outside
      if (!event.target.closest('.comment-menu-container')) {
        setShowCommentMenu(null)
      }
      // Close message menu when clicking outside
      const isInsideMessageButton = event.target.closest('.message-menu-container')
      const isInsideDropdown = dropdownRef.current?.contains(event.target) || 
                              event.target.closest('[data-dropdown="message-menu"]')
      
      if (showMessageMenu && !isInsideMessageButton && !isInsideDropdown) {
        setShowMessageMenu(null)
        setMenuButtonRef(null)
        // Re-enable scrolling when dropdown closes
        document.body.style.overflow = 'auto'
        const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
        if (chatMessagesContainer) {
          chatMessagesContainer.style.overflow = 'auto'
        }
      }
    }

    // Function to update dropdown position on scroll
    const updateDropdownPosition = () => {
      if (menuButtonRef && showMessageMenu) {
        const rect = menuButtonRef.getBoundingClientRect()
        const chatPopup = document.querySelector(`.${styles.chatPopup}`)
        const chatPopupRect = chatPopup?.getBoundingClientRect()
        
        if (chatPopupRect) {
          // Position relative to chat popup
          setDropdownPosition({
            top: rect.top - chatPopupRect.top,
            left: rect.right - chatPopupRect.left + 8
          })
        } else {
          // Fallback to viewport positioning
          setDropdownPosition({
            top: rect.top,
            left: rect.right + 8
          })
        }
      }
    }

    // Add scroll listener to update dropdown position
    const handleScroll = () => {
      updateDropdownPosition()
    }

    document.addEventListener('keydown', handleEscKey)
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [showCommentModal, showDropdown, showNotifications, showChat, showProfileMenu, showMobileSearch, showCommentMenu, editingComment, showMenuDropdown, showMessageMenu, menuButtonRef, showEditModal])

  // Update selectedPost when posts change (for real-time comments)
  useEffect(() => {
    if (selectedPost && posts.length > 0) {
      const updatedPost = posts.find(p => p.id === selectedPost.id)
      if (updatedPost) {
        setSelectedPost(updatedPost)
      }
    }
  }, [posts, selectedPost])

  // Cleanup scrolling when dropdown closes or component unmounts
  useEffect(() => {
    if (!showMessageMenu) {
      document.body.style.overflow = 'auto'
      const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
      if (chatMessagesContainer) {
        chatMessagesContainer.style.overflow = 'auto'
      }
    }
    return () => {
      document.body.style.overflow = 'auto'
      const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
      if (chatMessagesContainer) {
        chatMessagesContainer.style.overflow = 'auto'
      }
    }
  }, [showMessageMenu])

  // Dedicated click-outside handler for message menu dropdown
  useEffect(() => {
    if (!showMessageMenu) return

    const handleMessageMenuClickOutside = (event) => {
      const isInsideButton = event.target.closest('.message-menu-container')
      const isInsideDropdown = dropdownRef.current?.contains(event.target) || 
                              event.target.closest('[data-dropdown="message-menu"]')
      
      if (!isInsideButton && !isInsideDropdown) {
        setShowMessageMenu(null)
        setMenuButtonRef(null)
        document.body.style.overflow = 'auto'
        const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
        if (chatMessagesContainer) {
          chatMessagesContainer.style.overflow = 'auto'
        }
      }
    }

    // Add event listener with a slight delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleMessageMenuClickOutside, true)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleMessageMenuClickOutside, true)
    }
  }, [showMessageMenu])

  // Listen for auth state changes and real-time posts
  useEffect(() => {
    if (!auth || !db) return // Wait for Firebase to initialize

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log('🔐 User authenticated:', currentUser.uid)
        setUser(currentUser)
        
        // Get user role and data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            
            // Merge Firebase Auth user with Firestore user data
            setUser({
              ...currentUser,
              firstName: userData.firstName || currentUser.displayName?.split(' ')[0] || 'User',
              lastName: userData.lastName || currentUser.displayName?.split(' ')[1] || '',
              email: currentUser.email,
              uid: currentUser.uid,
              role: userData.role
            })
            console.log('👤 User loaded:', userData.firstName, userData.lastName, 'Role:', userData.role)
          } else {
            console.log('User document does not exist')
            setUser({
              ...currentUser,
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
            ...currentUser,
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
    
    const messageListeners = new Map() // Track message listeners to prevent duplicates
    const conversationsMap = new Map() // Use Map to prevent duplicate conversations
    
    const unsubscribe = onSnapshot(chatsQuery, (chatsSnapshot) => {
      // Process each chat
      chatsSnapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id
        const chatData = chatDoc.data()
        const otherUserId = chatData.participants?.find(id => id !== user.uid)
        
        if (otherUserId && chatData.participantNames) {
          const otherUserName = chatData.participantNames[otherUserId] || 'User'
          const otherUserEmail = chatData.participantEmails?.[otherUserId] || ''
          
          // Clean up existing listener for this chat if it exists
          if (messageListeners.has(chatId)) {
            messageListeners.get(chatId)()
            messageListeners.delete(chatId)
          }
          
          // Initialize conversation in map first (prevents duplicates)
          conversationsMap.set(chatId, {
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
          
          // Set up real-time listener for messages in this chat
          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'desc')
          )
          
          const messageUnsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
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
            
            // Update conversation in map (this prevents duplicates)
            conversationsMap.set(chatId, {
              id: chatId,
              otherUserId,
              otherUserName,
              otherUserEmail,
              lastMessage: actualLastMessage,
              lastMessageTime: actualLastMessageTime,
              lastMessageSenderId: actualLastMessageSenderId,
              unreadCount,
              isLastMessageFromOther
            })
            
            // Auto-open chat if there's a new message from someone else
            if (isLastMessageFromOther && unreadCount > 0) {
              setShowChat(true)
              setSelectedChat(null)
              setChatMessages([])
              setShowNotifications(false)
            }
            
            // Update conversations state from map (guaranteed no duplicates)
            const uniqueConversations = Array.from(conversationsMap.values())
            const sortedConversations = uniqueConversations.sort((a, b) => {
              if (!a.lastMessageTime && !b.lastMessageTime) return 0
              if (!a.lastMessageTime) return 1
              if (!b.lastMessageTime) return -1
              const aTime = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : new Date(a.lastMessageTime).getTime()
              const bTime = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : new Date(b.lastMessageTime).getTime()
              return bTime - aTime
            })
            
            setConversations(sortedConversations)
            setUnreadChats(sortedConversations.filter(conv => conv.unreadCount > 0).length)
          })
          
          // Store the unsubscribe function
          messageListeners.set(chatId, messageUnsubscribe)
        }
      })
      
      // Set initial conversations from map (no duplicates possible)
      const initialConversations = Array.from(conversationsMap.values())
      setConversations(initialConversations)
    })
    
    // Return cleanup function
    return () => {
      unsubscribe()
      // Clean up all message listeners
      messageListeners.forEach(unsubscribeFunc => unsubscribeFunc())
      messageListeners.clear()
    }
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

  const filteredConversations = conversations

  // Load messages for selected chat
  const loadChatMessages = async (chatId) => {
    if (!chatId || !db) return
    
    try {
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
      )
      
      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setChatMessages(messages)
        
        // Clear any existing timeout
        if (markAsReadTimeoutRef.current) {
          clearTimeout(markAsReadTimeoutRef.current)
        }
        
        // Mark unread messages as read when viewing the chat (with delay to ensure user sees them)
        markAsReadTimeoutRef.current = setTimeout(async () => {
          const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore')
          const unreadMessages = snapshot.docs.filter(doc => {
            const msgData = doc.data()
            return msgData.senderId !== user?.uid && !msgData.read
          })
          
          // Mark each unread message as read
          for (const messageDoc of unreadMessages) {
            try {
              await updateDoc(messageDoc.ref, { read: true })
            } catch (error) {
              console.error('Error marking message as read:', error)
            }
          }
        }, 1000) // 1 second delay to ensure user actually sees the messages
        
        // Auto-scroll to bottom when new messages arrive (instant, no animation)
        setTimeout(() => {
          const messagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          }
        }, 100) // Small delay to ensure DOM is updated
      })
      
      return unsubscribe
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user || !db) return
    
    try {
      const chatId = selectedChat.id
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
        createdAt: serverTimestamp(),
        read: false
      }
      
      // Add message to chat
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
      
      // Update chat's last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      })
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Handle listing request response (Accept/Decline)
  const handleRequestResponse = async (message, status) => {
    if (!user || !db || !message.listingId) return

    try {
      // Update the message status
      const chatId = selectedChat.id
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        requestStatus: status
      })

      // Update the listing request in the database
      const requestsQuery = query(
        collection(db, 'listing_requests'),
        where('listingId', '==', message.listingId),
        where('requesterId', '==', message.senderId)
      )
      
      const requestSnapshot = await getDocs(requestsQuery)
      if (!requestSnapshot.empty) {
        const requestDoc = requestSnapshot.docs[0]
        await updateDoc(doc(db, 'listing_requests', requestDoc.id), {
          status: status,
          respondedAt: serverTimestamp(),
          respondedBy: user.uid
        })
      }

      // Send a response message
      const responseMessage = status === 'approved' 
        ? `I have accepted your request for the listing: ${message.text.split(': ')[1] || 'the listing'}`
        : `I have declined your request for the listing: ${message.text.split(': ')[1] || 'the listing'}`

      const responseData = {
        text: responseMessage,
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
        createdAt: serverTimestamp(),
        read: false,
        isRequestResponse: true,
        originalRequestId: message.id,
        requestStatus: status
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), responseData)

      // Update chat's last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: responseMessage,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      })

      alert(`Request ${status} successfully!`)
    } catch (error) {
      console.error('Error handling request response:', error)
      alert('Failed to process request. Please try again.')
    }
  }

  // Go back to conversations list
  const goBackToConversations = () => {
    // Clear any pending mark-as-read timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current)
    }
    setSelectedChat(null)
    setChatMessages([])
    setNewMessage('')
  }

  // Mark conversation as read
  const markConversationAsRead = async (conversationId) => {
    try {
      // Update the conversation in the conversations state
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
        
        // Recalculate total unread chats count
        const totalUnread = updatedConversations.reduce((total, conv) => 
          total + (conv.unreadCount > 0 ? 1 : 0), 0
        )
        setUnreadChats(totalUnread)
        
        return updatedConversations
      })
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }

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
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length > 0) {
      // Add new files to existing ones instead of replacing
      const newImageFiles = [...imageFiles, ...validFiles]
      setImageFiles(newImageFiles)
      
      // Create previews for new images and add to existing previews
      const newPreviews = []
      let loadedCount = 0
      
      validFiles.forEach((file, index) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews[index] = e.target.result
          loadedCount++
          
          if (loadedCount === validFiles.length) {
            setImagePreviews(prev => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      })
    }
    
    // Reset the input value so the same file can be selected again
    e.target.value = ''
  }

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  const removeAllImages = () => {
    setImageFiles([])
    setImagePreviews([])
  }

  // Format timestamp for chat messages
  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const now = new Date()
    const messageTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffInMs = Math.abs(now - messageTime)
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}min`
    } else if (diffInHours < 24) {
      return `${diffInHours}hr`
    } else {
      return `${diffInDays}day`
    }
  }

  // Carousel navigation functions with smooth animation
  const nextImage = (postId, maxImages) => {
    const currentIndex = currentImageIndex[postId] || 0
    if (currentIndex < maxImages - 1) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [postId]: currentIndex + 1
      }))
    }
  }

  const prevImage = (postId) => {
    const currentIndex = currentImageIndex[postId] || 0
    if (currentIndex > 0) {
      setCurrentImageIndex(prev => ({
        ...prev,
        [postId]: currentIndex - 1
      }))
    }
  }

  const openPostModal = () => {
    setShowPostModal(true)
    // Disable body scroll
    document.body.style.overflow = 'hidden'
  }

  const closePostModal = () => {
    setShowPostModal(false)
    setPostText('')
    removeAllImages()
    // Re-enable body scroll
    document.body.style.overflow = 'unset'
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
    if ((!postText.trim() && imageFiles.length === 0) || !user || !db) return

    setLoading(true)
    try {
      let imageUrls = []
      
      // Upload multiple images to Cloudinary if selected
      if (imageFiles.length > 0) {
        console.log('Uploading images to Cloudinary...')
        for (const imageFile of imageFiles) {
          const imageUrl = await uploadImageToCloudinary(imageFile)
          imageUrls.push(imageUrl)
          console.log('Image uploaded successfully:', imageUrl)
        }
      }

      console.log('Saving post to Firestore...')
      
      // Create post with multiple images support
      const postData = {
        text: postText.trim(),
        userId: user.uid,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
        userEmail: user.email,
        imageUrls: imageUrls,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null, // Keep backward compatibility
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      }
      
      console.log('Post data:', postData)
      
      await addDoc(collection(db, 'Posts'), postData)

      console.log('Post created successfully!')
      
      setPostText('')
      removeAllImages()
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
    if (!commentText.trim() || !user || !selectedPost || commentLoading) return

    // Store the comment text before clearing it
    const currentCommentText = commentText.trim()
    
    // Clear the input immediately (social media behavior)
    setCommentText('')
    
    // Set loading state
    setCommentLoading(true)

    try {
      const postRef = doc(db, 'Posts', selectedPost.id)
      const newComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: currentCommentText,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
        userEmail: user.email,
        userId: user.uid,
        createdAt: new Date()
      }

      // Update selectedPost immediately for optimistic UI
      setSelectedPost(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }))

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
          currentCommentText
        )
      } else {
        console.log('Not sending comment notification - same user or missing userId')
      }

    } catch (error) {
      console.error('Error adding comment:', error)
      // If there's an error, restore the comment text
      setCommentText(currentCommentText)
      // Remove the optimistically added comment
      setSelectedPost(prev => ({
        ...prev,
        comments: prev.comments.filter(comment => comment.text !== currentCommentText || comment.userId !== user.uid)
      }))
    } finally {
      // Clear loading state
      setCommentLoading(false)
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
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
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
    setEditingPost(post)
    setEditText(post.text)
    
    // Initialize existing images
    const existingImages = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
    setEditImagePreviews(existingImages)
    setEditImageFiles([]) // Start with no new files
    
    setShowEditModal(true)
    setShowDropdown(null)
  }

  const handleSaveEdit = async () => {
    if ((!editText.trim() && editImagePreviews.length === 0) || !db || !editingPost) return

    setEditLoading(true)

    try {
      // Upload new images to Cloudinary
      const newImageUrls = []
      if (editImageFiles.length > 0) {
        console.log('Uploading new images for edit...')
        for (const file of editImageFiles) {
          const imageUrl = await uploadImageToCloudinary(file)
          newImageUrls.push(imageUrl)
          console.log('New image uploaded successfully:', imageUrl)
        }
      }

      // Combine existing images (that weren't removed) with new uploaded images
      const existingImages = editingPost.imageUrls || (editingPost.imageUrl ? [editingPost.imageUrl] : [])
      const finalImageUrls = []
      
      // Add existing images that are still in previews
      editImagePreviews.forEach(preview => {
        if (existingImages.includes(preview)) {
          finalImageUrls.push(preview)
        }
      })
      
      // Add new uploaded images
      finalImageUrls.push(...newImageUrls)

      console.log('Updating post with new data...')
      
      const postRef = doc(db, 'Posts', editingPost.id)
      const updateData = {
        text: editText.trim(),
        editedAt: serverTimestamp()
      }

      // Update image fields
      if (finalImageUrls.length > 0) {
        updateData.imageUrls = finalImageUrls
        updateData.imageUrl = finalImageUrls[0] // Keep backward compatibility
      } else {
        // Remove image fields if no images
        updateData.imageUrls = []
        updateData.imageUrl = null
      }

      await updateDoc(postRef, updateData)
      
      setEditingPost(null)
      setEditText('')
      setEditImageFiles([])
      setEditImagePreviews([])
      setShowEditModal(false)
      setEditLoading(false)
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post. Please try again.')
      setEditLoading(false)
    }
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingPost(null)
    setEditText('')
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditLoading(false)
  }

  const handleEditImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Create preview URLs for new files
    const newPreviews = files.map(file => URL.createObjectURL(file))
    
    // Add new files and previews to existing ones
    setEditImageFiles(prev => [...prev, ...files])
    setEditImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeEditImage = (index) => {
    setEditImagePreviews(prev => {
      const newPreviews = [...prev]
      // If it's a blob URL (new file), revoke it to free memory
      if (newPreviews[index].startsWith('blob:')) {
        URL.revokeObjectURL(newPreviews[index])
      }
      newPreviews.splice(index, 1)
      return newPreviews
    })
    
    // Remove from files array if it's a new file
    setEditImageFiles(prev => {
      const existingImagesCount = (editingPost?.imageUrls || (editingPost?.imageUrl ? [editingPost.imageUrl] : [])).length
      if (index >= existingImagesCount) {
        const newFiles = [...prev]
        newFiles.splice(index - existingImagesCount, 1)
        return newFiles
      }
      return prev
    })
  }

  const handleDeletePost = (postId) => {
    setPostToDelete(postId)
    setShowDeleteModal(true)
    setShowDropdown(null)
    // Prevent all scrolling
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  }

  const confirmDeletePost = async () => {
    if (!postToDelete || !db) return

    try {
      await deleteDoc(doc(db, 'Posts', postToDelete))
      setShowDeleteModal(false)
      setPostToDelete(null)
      // Restore all scrolling
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
      document.body.style.position = 'unset'
      document.body.style.width = 'unset'
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

  const cancelDeletePost = () => {
    setShowDeleteModal(false)
    setPostToDelete(null)
    // Restore all scrolling
    document.body.style.overflow = 'unset'
    document.documentElement.style.overflow = 'unset'
    document.body.style.position = 'unset'
    document.body.style.width = 'unset'
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

      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/report-comment', {
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

  const handleReportPost = (postId) => {
    const targetPost = posts.find(post => post.id === postId)
    if (!targetPost) {
      alert('Post not found')
      return
    }

    setReportedPost(targetPost)
    setShowReportModal(true)
    setShowDropdown(null)
    // Prevent all scrolling when modal is open
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  }

  // Handle ESC key to close report modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showReportModal) {
        closeReportModal()
      }
    }

    if (showReportModal) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showReportModal])

  const closeReportModal = () => {
    setShowReportModal(false)
    setReportType('')
    setReportDescription('')
    setReportedPost(null)
    setReportEvidence(null)
    setReportImageIndex(0)
    // Re-enable body scroll
    document.body.style.overflow = 'unset'
    document.body.style.position = 'unset'
    document.body.style.width = 'unset'
  }

  // Load user's reports
  const loadUserReports = async () => {
    if (!user) {
      console.log('No user found, cannot load reports')
      return
    }
    
    console.log('Loading reports for user:', user.uid)
    setReportsLoading(true)
    
    try {
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore')
      const reportsRef = collection(db, 'reports')
      const q = query(
        reportsRef,
        where('reporterId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      console.log('Executing reports query...')
      const snapshot = await getDocs(q)
      console.log('Reports query result:', snapshot.size, 'documents found')
      
      const reportsData = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Report document:', doc.id, data)
        return {
          id: doc.id,
          ...data
        }
      })
      
      setUserReports(reportsData)
      setReportsLoading(false)
      console.log('Reports loaded successfully:', reportsData.length, 'reports')
      
    } catch (error) {
      console.error('Error loading reports:', error)
      setUserReports([])
      setReportsLoading(false)
    }
  }

  // Report modal carousel navigation functions
  const nextReportImage = () => {
    const images = getPostImages(reportedPost)
    if (images.length > 1) {
      setReportImageIndex((prev) => (prev + 1) % images.length)
    }
  }

  const prevReportImage = () => {
    const images = getPostImages(reportedPost)
    if (images.length > 1) {
      setReportImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  // Helper function to get all images from a post (exact match with original post)
  const getPostImages = (post) => {
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

  const handleReportSubmit = async () => {
    if (!reportType) {
      alert('Please select a report type')
      return
    }

    setReportLoading(true)
    
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        alert('You must be logged in to report posts')
        setReportLoading(false)
        return
      }

      // Generate unique report ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const reportData = {
        // Auto-captured data from selected post
        reportId: reportId,
        reporterId: currentUser.uid, // Auto: Current user ID
        reportedUserId: reportedPost.userId || reportedPost.userEmail, // Auto: Reported user ID
        postId: reportedPost.id, // Auto: Post ID
        postContent: reportedPost.text || reportedPost.content || '', // Auto: Post caption/text
        postAuthor: reportedPost.userName || reportedPost.userEmail || 'Unknown', // Auto: Post author
        postImageUrl: reportedPost.imageUrl || reportedPost.image || null, // Auto: Post photo if exists
        postVideoUrl: reportedPost.videoUrl || reportedPost.video || null, // Auto: Post video if exists
        postCreatedAt: reportedPost.createdAt || reportedPost.timestamp || null, // Auto: When post was created
        
        // User-provided data
        reportType: reportType, // User selects this
        description: reportDescription || '', // User types this (optional)
        
        // System data
        timestamp: new Date().toISOString(),
        reporterName: currentUser.displayName || currentUser.email || 'Anonymous',
        reporterEmail: currentUser.email || ''
      }

      // Handle additional evidence upload if present (separate from post photo)
      if (reportEvidence) {
        // This is additional evidence the reporter uploads
        reportData.additionalEvidenceFileName = reportEvidence.name
        reportData.additionalEvidenceType = reportEvidence.type
        reportData.additionalEvidenceSize = reportEvidence.size
      }

      // First, save report to Firebase
      const { addDoc, collection } = await import('firebase/firestore')
      const docRef = await addDoc(collection(db, 'reports'), {
        ...reportData,
        status: 'processing',
        createdAt: new Date()
      })

      console.log('Report saved to Firebase with ID:', docRef.id)
      console.log('📋 Auto-captured data:', {
        userID: reportData.reporterId,
        reportedUserID: reportData.reportedUserId,
        postID: reportData.postId,
        caption: reportData.postContent,
        photo: reportData.postImageUrl,
        video: reportData.postVideoUrl,
        reportType: reportData.reportType,
        description: reportData.description
      })

      // Send to n8n webhook
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      
      if (webhookUrl && webhookUrl !== 'https://your-n8n-instance.com/webhook/report-validation') {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
          })

          if (!response.ok) {
            console.warn('n8n webhook failed, but report saved to Firebase')
          }
        } catch (webhookError) {
          console.warn('n8n webhook error:', webhookError)
          // Continue anyway since report is saved to Firebase
        }
      } else {
        console.log('No n8n webhook URL configured, report saved to Firebase only')
      }

      // Show success message and add to notifications
      alert('Report submitted successfully! Your report is being processed.')

      // Add a notification to the user's notification list
      try {
        const { addDoc, collection } = await import('firebase/firestore')
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          type: 'report_submitted',
          title: 'Report Submitted',
          message: `Your report for ${reportType} has been submitted and is being processed.`,
          read: false,
          createdAt: new Date(),
          reportId: reportId
        })
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError)
      }

      closeReportModal()
      
    } catch (error) {
      console.error('Error reporting post:', error)
      alert('Failed to submit report. Please try again.')
    } finally {
      setReportLoading(false)
    }
  }

  const handleEvidenceUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setReportEvidence(file)
    }
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


  // Format notification time
  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'now'
    
    const now = new Date()
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffMs = now - notificationTime
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return '1 day'
    if (diffDays < 7) return `${diffDays} days`
    return `${Math.floor(diffDays / 7)}w`
  }

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification)
    setShowNotifications(false)
    
    // Mark notification as read if it's unread
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id)
        // Update local state to reflect the change immediately
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
    
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

  // Show dashboard even while loading user data
  // Authentication will redirect to login if needed via AuthGuard

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
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'home' ? styles.active : ''}`} onClick={() => {
                // Navigate to home/dashboard
                setActiveMenuItem('home')
                console.log('Home clicked')
              }}>
                <img src={activeMenuItem === 'home' ? "/assets/icons/home-white.png" : "/assets/icons/home.png"} alt="Home" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Home</span>
              </div>
              
              <div className={styles.leftMenuItem} onClick={() => {
                // Handle search functionality when implemented
                console.log('Search clicked')
              }}>
                <img src="/assets/icons/search.png" alt="Search" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Search</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'listings' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('listings')
                console.log('Listings clicked')
              }}>
                <img src={activeMenuItem === 'listings' ? "/assets/icons/listing-white.png" : "/assets/icons/listing.png"} alt="Listings" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Listings</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'listing-history' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('listing-history')
                console.log('Listing History clicked')
              }}>
                <img src={activeMenuItem === 'listing-history' ? "/assets/icons/time-past-white.png" : "/assets/icons/time-past.png"} alt="Listing History" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>
                  {userRole === 'crop_farmer' ? 'Request Listing History' : 'Listing History'}
                </span>
              </div>
              
              
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'profile' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('profile')
                console.log('Profile clicked')
              }}>
                <img src={activeMenuItem === 'profile' ? "/assets/icons/profile-white.png" : "/assets/icons/profile.png"} alt="Profile" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Profile</span>
              </div>
              
            </div>
            
            {/* Menu Button at Bottom */}
            <div className={styles.leftMenuBottom}>
              <div className="menu-dropdown-container" style={{ position: 'relative' }}>
                <div className={styles.leftMenuItem} onClick={() => {
                  setShowMenuDropdown(!showMenuDropdown)
                }}>
                  <img src="/assets/icons/menu.png" alt="Menu" className={styles.leftMenuIcon} />
                  <span className={styles.leftMenuText}>Menu</span>
                </div>
                
                {/* Menu Dropdown */}
                {showMenuDropdown && (
                  <div className={styles.menuDropdown}>
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('Change Role clicked')
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/rotate-reverse.png" alt="Change Role" className={styles.menuDropdownIcon} />
                      <span>Change Role</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('Settings clicked')
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/settings.png" alt="Settings" className={styles.menuDropdownIcon} />
                      <span>Settings</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('My Reports clicked')
                      setActiveMenuItem('reports')
                      loadUserReports()
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/triangle-warning.png" alt="My Reports" className={styles.menuDropdownIcon} />
                      <span>My Reports</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('Appearance clicked')
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/appearance.png" alt="Appearance" className={styles.menuDropdownIcon} />
                      <span>Switch Appearance</span>
                    </div>
                    
                    <div className={`${styles.menuDropdownItem} ${styles.logout}`} onClick={() => {
                      handleLogout()
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/logout.png" alt="Logout" className={styles.menuDropdownIcon} />
                      <span>Logout</span>
                    </div>
                  </div>
                )}
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
              if (showChat) {
                // Close chat and reset state
                setShowChat(false)
                setSelectedChat(null)
                setChatMessages([])
              } else {
                // Close notifications if open, then open chat
                if (showNotifications) {
                  setShowNotifications(false)
                  document.body.style.overflow = 'auto'
                }
                // Open chat and ensure we're at conversations list
                setShowChat(true)
                setSelectedChat(null)
                setChatMessages([])
              }
            }}
            onMouseEnter={() => {
              document.body.style.overflow = 'hidden'
            }}
            onMouseLeave={() => {
              document.body.style.overflow = 'auto'
            }}
          >
            <img src="/assets/icons/chat.png" alt="Messages" className={styles.messageIcon} />
            <span className={styles.messageText}>Messages</span>
            {unreadChats > 0 && (
              <span className={styles.messageBadge}>
                {unreadChats > 99 ? '99+' : unreadChats}
              </span>
            )}
          </div>
          
          {/* Chat Popup */}
          {showChat && (
            <div 
              className={styles.chatPopup} 
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onMouseEnter={() => {
                document.body.style.overflow = 'hidden'
              }}
              onMouseLeave={() => {
                document.body.style.overflow = 'auto'
              }}
            >
              <div className={styles.chatPopupHeader}>
                {selectedChat ? (
                  <>
                    <button 
                      className={styles.backButton}
                      onClick={goBackToConversations}
                    >
                      <img src="/assets/icons/back.png" alt="Back" style={{width: '16px', height: '16px'}} />
                    </button>
                    <h3 className={styles.chatPopupTitle}>{selectedChat.otherUserName}</h3>
                  </>
                ) : (
                  <h3 className={styles.chatPopupTitle}>Chats</h3>
                )}
                <button 
                  className={styles.chatPopupCloseBtn}
                  onClick={() => {
                    setShowChat(false)
                    setSelectedChat(null)
                    setChatMessages([])
                  }}
                >
                  <img src="/assets/icons/cross-small.png" alt="Close" style={{width: '16px', height: '16px'}} />
                </button>
              </div>
              
              {selectedChat ? (
                /* Chat Messages View */
                <>
                  <div 
                    className={styles.chatMessagesContainer}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {chatMessages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`${styles.chatMessage} ${message.senderId === user?.uid ? styles.sentMessage : styles.receivedMessage}`}
                      >
                        <div className={styles.messageContent}>
                          <p className={styles.messageText}>{message.text}</p>
                          
                          {/* Accept/Decline buttons for listing requests */}
                          {message.isListingRequest && message.senderId !== user?.uid && message.requestStatus === 'pending' && (
                            <div className={styles.requestActions}>
                              <button 
                                className={styles.acceptButton}
                                onClick={() => handleRequestResponse(message, 'approved')}
                              >
                                Accept
                              </button>
                              <button 
                                className={styles.declineButton}
                                onClick={() => handleRequestResponse(message, 'declined')}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          
                          {/* Status indicator for processed requests */}
                          {message.isListingRequest && message.requestStatus && message.requestStatus !== 'pending' && (
                            <div className={styles.requestStatus}>
                              <span className={`${styles.statusBadge} ${styles[message.requestStatus]}`}>
                                {message.requestStatus.charAt(0).toUpperCase() + message.requestStatus.slice(1)}
                              </span>
                            </div>
                          )}
                          
                          {/* 3-dots menu for received messages only */}
                          {message.senderId !== user?.uid && (
                            <div className="message-menu-container">
                              <div className={`${styles.messageMenu} ${showMessageMenu === message.id ? styles.menuOpen : ''}`}>
                                <button 
                                  className={styles.messageMenuBtn}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (showMessageMenu === message.id) {
                                      setShowMessageMenu(null)
                                      setMenuButtonRef(null)
                                    } else {
                                      const rect = e.target.getBoundingClientRect()
                                      const chatPopup = document.querySelector(`.${styles.chatPopup}`)
                                      const chatPopupRect = chatPopup?.getBoundingClientRect()
                                      
                                      if (chatPopupRect) {
                                        // Position relative to chat popup
                                        setDropdownPosition({
                                          top: rect.top - chatPopupRect.top,
                                          left: rect.right - chatPopupRect.left + 8
                                        })
                                      } else {
                                        // Fallback to viewport positioning
                                        setDropdownPosition({
                                          top: rect.top,
                                          left: rect.right + 8
                                        })
                                      }
                                      setMenuButtonRef(e.target)
                                      setShowMessageMenu(message.id)
                                    }
                                  }}
                                >
                                  <span>⋯</span>
                                </button>
                                
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={styles.messageTime}>
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div 
                    className={styles.chatInputContainer}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {(() => {
                      // Check if there's an approved request between these users
                      const hasApprovedRequest = chatMessages.some(msg => 
                        msg.isListingRequest && msg.requestStatus === 'approved'
                      )
                      
                      // Check if current user is the listing owner (can always chat)
                      const isListingOwner = userRole === 'livestock_owner'
                      
                      // Allow chat if: user is livestock owner OR there's an approved request
                      const canChat = isListingOwner || hasApprovedRequest
                      
                      if (!canChat) {
                        return (
                          <div className={styles.chatRestricted}>
                            <p className={styles.restrictedText}>
                              💬 Chat will be available after the listing owner approves your request
                            </p>
                          </div>
                        )
                      }
                      
                      return (
                        <>
                          <input
                            type="text"
                            placeholder="Type a message..."
                            className={styles.chatInput}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                sendMessage()
                              }
                            }}
                            onWheel={(e) => e.stopPropagation()}
                          />
                          <button 
                            className={styles.sendButton}
                            onClick={sendMessage}
                            disabled={!newMessage.trim()}
                            onWheel={(e) => e.stopPropagation()}
                          >
                            Send
                          </button>
                        </>
                      )
                    })()}
                  </div>
                </>
              ) : (
                /* Conversations List */
                <div 
                  className={styles.conversationsList}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <div 
                        key={conversation.id} 
                        className={`${styles.conversationItem} ${conversation.unreadCount > 0 ? styles.hasUnread : ''} ${selectedChat?.id === conversation.id ? styles.selectedConversation : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedChat(conversation)
                          loadChatMessages(conversation.id)
                          // Mark conversation as read when clicked
                          if (conversation.unreadCount > 0) {
                            markConversationAsRead(conversation.id)
                          }
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
                        Request livestock listings to start chatting with owners
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Notifications Button */}
        <div className={styles.floatingNotifications}>
          <div 
            className={styles.notificationsButton}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (showNotifications) {
                // Close notifications and restore scrolling
                setShowNotifications(false)
                document.body.style.overflow = 'auto'
              } else {
                // Close chat if open, then open notifications
                if (showChat) {
                  setShowChat(false)
                  setSelectedChat(null)
                  setChatMessages([])
                }
                setShowNotifications(true)
              }
            }}
            onMouseEnter={() => {
              document.body.style.overflow = 'hidden'
            }}
            onMouseLeave={() => {
              document.body.style.overflow = 'auto'
            }}
          >
            <img src="/assets/icons/bell.png" alt="Notifications" className={styles.notificationIcon} />
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div 
              className={styles.notificationsDropdown}
              onMouseEnter={() => {
                document.body.style.overflow = 'hidden'
              }}
              onMouseLeave={() => {
                document.body.style.overflow = 'auto'
              }}
            >
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
                  notifications
                    .sort((a, b) => {
                      // Sort by createdAt timestamp, newest first
                      const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0)
                      const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0)
                      return timeB - timeA
                    })
                    .slice(0, 10)
                    .map((notification) => (
                    <div 
                      key={notification.id}
                      className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={styles.notificationAvatar}>
                        {notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName[0].toUpperCase() : 'A'}
                      </div>
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationMainText}>
                          <span>
                            {notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'AgriLink User'} {notification.actionText || (notification.actionType === 'like' ? 'liked your post' : 'commented on your post')}
                          </span>
                        </div>
                        <div className={styles.notificationTimeLine}>
                          <span className={styles.notificationTime}>
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.notificationIcon}>
                        {notification.actionType === 'like' ? (
                          <img src="/assets/icons/red-heart.png" alt="Like" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                        ) : (
                          <img src="/assets/icons/comment-all-dots.png" alt="Comment" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                        )}
                      </div>
                      {!notification.read && <div className={styles.unreadDot}></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Feed - Hide when listings or listing-history is active */}
        {activeMenuItem !== 'listings' && activeMenuItem !== 'listing-history' && (
        <main className={styles.mainFeed}>
          {/* Post Creation Prompt - Only show when not viewing reports, listings, or profile */}
          {activeMenuItem !== 'reports' && activeMenuItem !== 'listings' && activeMenuItem !== 'profile' && (
            <div className={styles.postPromptContainer}>
              <div className={styles.postPrompt}>
                <div className={styles.userAvatar}>
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                </div>
                <div className={styles.clickableTextBox} onClick={openPostModal}>
                  What's on your mind?
                </div>
              </div>
            </div>
          )}


          {/* News Feed / Reports / Listings */}
          <div className={styles.newsFeed}>
            {activeMenuItem === 'listings' ? (
              // Direct Listings Component Integration
              <Listings />
            ) : activeMenuItem === 'profile' ? (
              <>
                {/* Profile Info Container */}
                <div className={styles.profileInfoContainer}>
                  <div className={styles.profilePictureContainer}>
                    <div className={styles.profilePicture}>
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className={styles.profileImage} />
                      ) : (
                        user?.displayName ? user.displayName[0].toUpperCase() : 
                        user?.firstName ? user.firstName[0].toUpperCase() : 'U'
                      )}
                    </div>
                  </div>
                  <div className={styles.profileMainInfo}>
                    <h1 className={styles.profileName}>
                      {user?.displayName || 
                       (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User Profile')}
                    </h1>
                    <p className={styles.profileEmail}>
                      {user?.email || 'No email available'}
                    </p>
                    <p className={styles.profilePhone}>
                      {user?.phoneNumber || 'No phone number'}
                    </p>
                    <p className={styles.profileRole}>
                      {userRole === 'livestock_owner' ? 'Livestock Owner' : 
                       userRole === 'crop_farmer' ? 'Crop Farmer' : 'User'}
                    </p>
                  </div>
                </div>
                
                {/* Profile Posts Feed */}
                <div className={styles.profilePosts}>
                  {posts.filter(post => post.userId === user?.uid).length === 0 ? (
                    <div className={styles.noPostsMessage}>
                      <div className={styles.noPostsIcon}>📝</div>
                      <h3>No posts yet</h3>
                      <p>When you create posts, they'll appear here.</p>
                    </div>
                  ) : (
                    posts.filter(post => post.userId === user?.uid).map((post) => (
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
                              data-post-options={post.id}
                            >
                              <img src="/assets/icons/menu-dots.png" alt="Options" className={styles.optionsIcon} />
                            </button>
                            {showDropdown === post.id && (
                              <div className={styles.dropdown}>
                                <button onClick={() => handleEditPost(post)} className={`${styles.dropdownItem} ${styles.editDropdownItem}`}>
                                  <img src="/assets/icons/pencil.png" alt="Edit" className={styles.dropdownIcon} />
                                  Edit Post
                                </button>
                                <button onClick={() => handleDeletePost(post.id)} className={`${styles.dropdownItem} ${styles.deleteDropdownItem}`}>
                                  <img src="/assets/icons/delete-white.png" alt="Delete" className={styles.dropdownIcon} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.postContent}>
                          <p 
                            style={{ whiteSpace: 'pre-wrap', cursor: 'pointer' }}
                            onClick={() => openCommentModal(post)}
                          >
                            {post.text}
                          </p>
                          {(post.imageUrls?.length > 0 || post.imageUrl) && (
                            <div className={styles.imageCarousel}>
                              {(() => {
                                const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
                                const currentIndex = currentImageIndex[post.id] || 0
                                const currentImage = images[currentIndex] || images[0]
                                
                                return (
                                  <>
                                    <div className={styles.imageContainer} data-post-id={post.id}>
                                      <div 
                                        className={styles.imageSlider}
                                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                                      >
                                        {images.map((imageUrl, index) => (
                                          <img 
                                            key={index}
                                            src={imageUrl} 
                                            alt={`Post image ${index + 1}`} 
                                            className={styles.postImage}
                                            onClick={() => openCommentModal(post)}
                                            style={{ cursor: 'pointer' }}
                                          />
                                        ))}
                                      </div>
                                      
                                      {images.length > 1 && (
                                        <>
                                          {currentIndex > 0 && (
                                            <button 
                                              className={`${styles.carouselBtn} ${styles.prevBtn}`}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                prevImage(post.id)
                                              }}
                                            >
                                              <img src="/assets/icons/back.png" alt="Previous" />
                                            </button>
                                          )}
                                          
                                          {currentIndex < images.length - 1 && (
                                            <button 
                                              className={`${styles.carouselBtn} ${styles.nextBtn}`}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                nextImage(post.id, images.length)
                                              }}
                                            >
                                              <img src="/assets/icons/greater-than-symbol.png" alt="Next" />
                                            </button>
                                          )}
                                          
                                          <div className={styles.imageIndicator}>
                                            {currentIndex + 1} / {images.length}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
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
                            {hasUserLiked(post) ? 'Liked' : 'Like'}
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
                    ))
                  )}
                </div>
              </>
            ) : activeMenuItem === 'reports' ? (
              // Reports Content
              <div className={styles.reportsContent}>
                <div className={styles.reportsHeader}>
                  <h2>My Reports</h2>
                  <p>Track the status of your submitted reports</p>
                </div>
                
                <div className={styles.reportsFilters}>
                  <button 
                    className={`${styles.filterBtn} ${reportsFilter === 'all' ? styles.active : ''}`}
                    onClick={() => setReportsFilter('all')}
                  >
                    All ({userReports.length})
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${reportsFilter === 'processing' ? styles.active : ''}`}
                    onClick={() => setReportsFilter('processing')}
                  >
                    Processing ({userReports.filter(r => r.status === 'processing').length})
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${reportsFilter === 'valid' ? styles.active : ''}`}
                    onClick={() => setReportsFilter('valid')}
                  >
                    Valid ({userReports.filter(r => r.status === 'valid').length})
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${reportsFilter === 'invalid' ? styles.active : ''}`}
                    onClick={() => setReportsFilter('invalid')}
                  >
                    Invalid ({userReports.filter(r => r.status === 'invalid').length})
                  </button>
                </div>

                {reportsLoading ? (
                  <div className={styles.loadingReports}>
                    <p>Loading your reports...</p>
                  </div>
                ) : userReports.length === 0 ? (
                  <div className={styles.emptyReports}>
                    <div className={styles.emptyIcon}>📋</div>
                    <h3>No Reports Yet</h3>
                    <p>You haven't submitted any reports yet. When you report a post, it will appear here with its status and details.</p>
                  </div>
                ) : (
                  <div className={styles.reportsList}>
                    {userReports.filter(report => reportsFilter === 'all' || report.status === reportsFilter).map(report => (
                      <div key={report.id} className={styles.reportCard}>
                        <div className={styles.reportHeader}>
                          <span className={styles.reportType}>{report.reportType}</span>
                          <span className={`${styles.reportStatus} ${styles[report.status]}`}>
                            {report.status}
                          </span>
                        </div>
                        <div className={styles.reportContent}>
                          {/* Report Details */}
                          <div className={styles.reportDetails}>
                            <p><strong>Report ID:</strong> {report.id}</p>
                            <p><strong>Submitted:</strong> {new Date(report.createdAt?.seconds * 1000 || report.createdAt).toLocaleString()}</p>
                            {report.processedAt && (
                              <p><strong>Processed:</strong> {new Date(report.processedAt?.seconds * 1000 || report.processedAt).toLocaleString()}</p>
                            )}
                          </div>

                          {/* Reported Post Content */}
                          <div className={styles.reportedPost}>
                            <h4>Reported Post:</h4>
                            <div className={styles.postPreview}>
                              <div className={styles.postAuthor}>
                                <strong>By:</strong> {report.reportedUserName || 'Unknown User'}
                              </div>
                              <div className={styles.postContent}>
                                {report.postContent || 'No text content'}
                              </div>
                              {report.postImageUrl && (
                                <div className={styles.postImage}>
                                  <img src={report.postImageUrl} alt="Reported post" />
                                </div>
                              )}
                              {report.postVideoUrl && (
                                <div className={styles.postVideo}>
                                  <video controls>
                                    <source src={report.postVideoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* User's Report Description */}
                          {report.description && (
                            <div className={styles.userDescription}>
                              <h4>Your Report:</h4>
                              <p>{report.description}</p>
                            </div>
                          )}

                          {/* AI Decision */}
                          {report.aiDecision && (
                            <div className={styles.aiDecision}>
                              <h4>AI Analysis:</h4>
                              <p><strong>Decision:</strong> {report.aiDecision.decision}</p>
                              <p><strong>Reasoning:</strong> {report.aiDecision.reasoning}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {userReports.filter(report => reportsFilter === 'all' || report.status === reportsFilter).length === 0 && (
                      <div className={styles.emptyReports}>
                        <div className={styles.emptyIcon}>🔍</div>
                        <h3>No {reportsFilter === 'all' ? '' : reportsFilter} Reports Found</h3>
                        <p>
                          {reportsFilter === 'all' 
                            ? "You haven't submitted any reports yet."
                            : `No reports with status "${reportsFilter}" found. Try a different filter.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Regular Posts Feed
              posts.map((post) => (
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
                      data-post-options={post.id}
                    >
                      <img src="/assets/icons/menu-dots.png" alt="Options" className={styles.optionsIcon} />
                    </button>
                    {showDropdown === post.id && (
                      <div className={styles.dropdown}>
                        {isUserPost(post) ? (
                          <>
                            <button onClick={() => handleEditPost(post)} className={`${styles.dropdownItem} ${styles.editDropdownItem}`}>
                              <img src="/assets/icons/pencil.png" alt="Edit" className={styles.dropdownIcon} />
                              Edit Post
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className={`${styles.dropdownItem} ${styles.deleteDropdownItem}`}>
                              <img src="/assets/icons/delete-white.png" alt="Delete" className={styles.dropdownIcon} />
                              Delete
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
                  <p 
                    style={{ whiteSpace: 'pre-wrap', cursor: 'pointer' }}
                    onClick={() => openCommentModal(post)}
                  >
                    {post.text}
                  </p>
                  {(post.imageUrls?.length > 0 || post.imageUrl) && (
                    <div className={styles.imageCarousel}>
                      {(() => {
                        const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
                        const currentIndex = currentImageIndex[post.id] || 0
                        const currentImage = images[currentIndex] || images[0]
                        
                        return (
                          <>
                            <div className={styles.imageContainer} data-post-id={post.id}>
                              <div 
                                className={styles.imageSlider}
                                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                              >
                                {images.map((imageUrl, index) => (
                                  <img 
                                    key={index}
                                    src={imageUrl} 
                                    alt={`Post image ${index + 1}`} 
                                    className={styles.postImage}
                                    onClick={() => openCommentModal(post)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ))}
                              </div>
                              
                              {images.length > 1 && (
                                <>
                                  {currentIndex > 0 && (
                                    <button 
                                      className={`${styles.carouselBtn} ${styles.prevBtn}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        prevImage(post.id)
                                      }}
                                    >
                                      <img src="/assets/icons/back.png" alt="Previous" />
                                    </button>
                                  )}
                                  
                                  {currentIndex < images.length - 1 && (
                                    <button 
                                      className={`${styles.carouselBtn} ${styles.nextBtn}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        nextImage(post.id, images.length)
                                      }}
                                    >
                                      <img src="/assets/icons/greater-than-symbol.png" alt="Next" />
                                    </button>
                                  )}
                                  
                                  <div className={styles.imageIndicator}>
                                    {currentIndex + 1} / {images.length}
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
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
                    {hasUserLiked(post) ? 'Liked' : 'Like'}
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
              ))
            )}
          </div>
        </main>
        )}

        {/* Listings Screen - Separate from main feed */}
        {activeMenuItem === 'listings' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <Listings />
          </div>
        )}

        {/* Listing History Screen - Separate from main feed */}
        {activeMenuItem === 'listing-history' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            marginLeft: '0',
            position: 'relative'
          }}>
            {userRole === 'crop_farmer' ? <RequestListingHistory /> : <ListingHistory />}
          </div>
        )}

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
                    {imagePreviews.length > 0 ? (
                      <div className={styles.multipleImagePreview}>
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className={styles.previewImageContainer}>
                            <img src={preview} alt={`Preview ${index + 1}`} className={styles.buttonPreviewImage} />
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeImage(index)
                              }}
                              className={styles.removeImageBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        <label className={styles.addMoreImagesBtn}>
                          <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                          Add More
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className={styles.hiddenInput}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className={styles.modalImageUpload}>
                        <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                        Add Photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className={styles.hiddenInput}
                        />
                      </label>
                    )}
                  </div>
                  
                  <button
                    onClick={handlePost}
                    disabled={loading || (!postText.trim() && imageFiles.length === 0)}
                    className={styles.modalPostButton}
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Post Modal */}
        {showEditModal && editingPost && (
          <div className={styles.modalOverlay} onClick={closeEditModal}>
            <div className={styles.postModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Edit Post</h3>
                <button onClick={closeEditModal} className={styles.closeModalBtn}>×</button>
              </div>
              
              <div className={styles.modalContent}>
                <div className={styles.modalUserInfo}>
                  <div className={styles.modalUserAvatar}>
                    {editingPost.userName ? editingPost.userName[0].toUpperCase() : 'U'}
                  </div>
                  <span className={styles.modalUserName}>
                    {editingPost.userName}
                  </span>
                </div>
                
                <div className={styles.modalBody}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="What's on your mind?"
                    className={styles.modalTextarea}
                    rows={4}
                    autoFocus
                  />
                </div>
                
                <div className={styles.modalFooter}>
                  <div className={styles.modalActions}>
                    {editImagePreviews.length > 0 ? (
                      <div className={styles.multipleImagePreview}>
                        {editImagePreviews.map((preview, index) => (
                          <div key={index} className={styles.previewImageContainer}>
                            <img src={preview} alt={`Preview ${index + 1}`} className={styles.buttonPreviewImage} />
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeEditImage(index)
                              }}
                              className={styles.removeImageBtn}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        <label className={styles.addMoreImagesBtn}>
                          <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                          Add More
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEditImageSelect}
                            className={styles.hiddenInput}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className={styles.modalImageUpload}>
                        <img src="/assets/icons/image.png" alt="Photo" className={styles.modalActionIcon} />
                        Add Photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className={styles.hiddenInput}
                        />
                      </label>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={closeEditModal}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={editLoading || (!editText.trim() && editImagePreviews.length === 0)}
                      className={styles.modalPostButton}
                    >
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div 
            className={styles.modalOverlay} 
            onClick={cancelDeletePost}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              // Prevent arrow keys, page up/down, home/end, space from scrolling
              if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault()
              }
            }}
          >
            <div 
              className={styles.deleteModal} 
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className={styles.deleteModalHeader}>
                <h3>Delete Post</h3>
              </div>
              
              <div className={styles.deleteModalContent}>
                <p>Are you sure you want to delete this post? This action cannot be undone.</p>
              </div>
              
              <div className={styles.deleteModalFooter}>
                <button
                  onClick={cancelDeletePost}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePost}
                  className={styles.deleteConfirmBtn}
                >
                  Delete
                </button>
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
                {(selectedPost.imageUrls?.length > 0 || selectedPost.imageUrl) && (
                  <div className={styles.imageCarousel}>
                    {(() => {
                      const images = selectedPost.imageUrls || (selectedPost.imageUrl ? [selectedPost.imageUrl] : [])
                      const currentIndex = currentImageIndex[`modal-${selectedPost.id}`] || 0
                      
                      return (
                        <>
                          <div className={styles.imageContainer} data-post-id={`modal-${selectedPost.id}`}>
                            <div 
                              className={styles.imageSlider}
                              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                            >
                              {images.map((imageUrl, index) => (
                                <img 
                                  key={index}
                                  src={imageUrl} 
                                  alt={`Post image ${index + 1}`} 
                                  className={styles.modalPostImage}
                                />
                              ))}
                            </div>
                            
                            {images.length > 1 && (
                              <>
                                {currentIndex > 0 && (
                                  <button 
                                    className={`${styles.carouselBtn} ${styles.prevBtn}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      prevImage(`modal-${selectedPost.id}`)
                                    }}
                                  >
                                    <img src="/assets/icons/back.png" alt="Previous" />
                                  </button>
                                )}
                                
                                {currentIndex < images.length - 1 && (
                                  <button 
                                    className={`${styles.carouselBtn} ${styles.nextBtn}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      nextImage(`modal-${selectedPost.id}`, images.length)
                                    }}
                                  >
                                    <img src="/assets/icons/greater-than-symbol.png" alt="Next" />
                                  </button>
                                )}
                                
                                <div className={styles.imageIndicator}>
                                  {currentIndex + 1} / {images.length}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
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
                  {hasUserLiked(selectedPost) ? 'Liked' : 'Like'}
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
                      if (e.key === 'Enter' && !commentLoading) {
                        handleAddComment()
                      }
                    }}
                    className={styles.commentInput}
                  />
                  <button 
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || commentLoading}
                    className={styles.commentSubmitBtn}
                  >
                    {commentLoading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal-based Message Menu Dropdown */}
      {showMessageMenu && typeof window !== 'undefined' && showChat && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.messageMenuDropdown}
          data-dropdown="message-menu"
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 500
          }}
          onClick={(e) => {
            // Prevent click events from bubbling up
            e.stopPropagation()
          }}
          onMouseEnter={(e) => {
            // Prevent scrolling when mouse is over dropdown
            const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
            if (chatMessagesContainer) {
              chatMessagesContainer.style.overflow = 'hidden'
            }
          }}
          onMouseLeave={(e) => {
            // Re-enable scrolling when mouse leaves dropdown
            const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
            if (chatMessagesContainer) {
              chatMessagesContainer.style.overflow = 'auto'
            }
          }}
        >
          <div className={styles.messageTimestampDisplay}>
            {formatChatTimestamp(chatMessages.find(m => m.id === showMessageMenu)?.createdAt)}
          </div>
          
          <div 
            className={styles.messageMenuOption}
            onClick={() => {
              console.log('Report message:', showMessageMenu)
              setShowMessageMenu(null)
              setMenuButtonRef(null)
              // Re-enable scrolling when dropdown closes
              const chatMessagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
              if (chatMessagesContainer) {
                chatMessagesContainer.style.overflow = 'auto'
              }
            }}
          >
            <span>Report</span>
          </div>
        </div>,
        document.querySelector(`.${styles.chatPopup}`)
      )}

      {/* Report Modal */}
      {showReportModal && reportedPost && (
        <div className={styles.modalOverlay} onClick={closeReportModal}>
          <div 
            className={styles.reportModal} 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Report {reportedPost.userName || reportedPost.userEmail || 'User'}'s post</h3>
              <button onClick={closeReportModal} className={styles.closeModalBtn}>×</button>
            </div>
            
            <div className={styles.modalContent}>
              {/* Simple Post Preview */}
              <div className={styles.reportPostPreview}>
                <div className={styles.simplePreviewContent}>
                  {/* Caption */}
                  <div className={styles.simpleCaptionSection}>
                    <p>{reportedPost.text || reportedPost.content || 'No caption'}</p>
                  </div>
                  
                  {/* Photos - Carousel if multiple */}
                  {(() => {
                    const images = getPostImages(reportedPost)
                    if (images.length === 0) return null

                    if (images.length === 1) {
                      return (
                        <div className={styles.simpleMediaSection}>
                          <img 
                            src={images[0]} 
                            alt="Reported post" 
                            className={styles.simplePostImage}
                          />
                        </div>
                      )
                    }

                    // Multiple images - show carousel
                    return (
                      <div className={styles.reportCarouselContainer}>
                        <div className={styles.reportCarousel}>
                          <img 
                            src={images[reportImageIndex]} 
                            alt={`Reported post ${reportImageIndex + 1}`} 
                            className={styles.simplePostImage}
                          />
                          
                          {/* Navigation arrows */}
                          <button 
                            className={styles.carouselBtnPrev}
                            onClick={prevReportImage}
                            disabled={images.length <= 1}
                          >
                            ‹
                          </button>
                          <button 
                            className={styles.carouselBtnNext}
                            onClick={nextReportImage}
                            disabled={images.length <= 1}
                          >
                            ›
                          </button>
                          
                          {/* Image counter */}
                          <div className={styles.reportImageCounter}>
                            {reportImageIndex + 1} / {images.length}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className={styles.modalBody}>
                {/* Report Type Selection */}
                <div className={styles.reportField}>
                  <label className={styles.reportLabel}>Report Type *</label>
                  <select 
                    value={reportType} 
                    onChange={(e) => setReportType(e.target.value)}
                    className={styles.reportSelect}
                  >
                    <option value="">Select a reason</option>
                    <option value="spam">Spam</option>
                    <option value="fraud">Fraud</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="inappropriate">Inappropriate Content</option>
                    <option value="harassment">Harassment</option>
                    <option value="violence">Violence or Threats</option>
                    <option value="copyright">Copyright Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className={styles.reportField}>
                  <label className={styles.reportLabel}>Additional Details (Optional)</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Provide additional context if needed..."
                    className={styles.reportTextarea}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={closeReportModal}
                disabled={reportLoading}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportType || reportLoading}
                className={styles.submitReportBtn}
              >
                {reportLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
