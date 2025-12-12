import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import Listings from './listings'
import RequestListingHistory from './request-listing-history'
import ListingHistory from './listing-history'
import Reports from './reports'
import Transactions from './transactions'
import CropfarmerTransactions from './cropfarmer-transactions'
import UserProfile from './user-profile'
import ReportModal from '../components/ReportModal'
import Chat from './chat'
import { usePopup } from '../contexts/PopupContext'
import { usePostHandlers } from '../components/PostHandlers'

import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
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
import { uploadImageToFirebaseStorage, uploadMultipleImagesToFirebaseStorage } from '../lib/firebaseStorage'
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount, sendPostLikeNotification, sendCommentNotification, sendCommentReplyNotification, debugNotifications } from '../lib/notificationService'
import styles from '../../styles/modules/dashboard.module.css'

export default function Dashboard() {
  const { showInfoPopup, showSuccessPopup, showErrorPopup, showConfirmPopup } = usePopup()
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
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(null)
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
  const [unreadChats, setUnreadChats] = useState(0) // Re-added for navigation badge
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationsClosing, setNotificationsClosing] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [editingComment, setEditingComment] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [showCommentMenu, setShowCommentMenu] = useState(null)
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [replyTextMap, setReplyTextMap] = useState({})
  const [showReplyInput, setShowReplyInput] = useState({})
  
  // Essential state variables
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState('home')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportedPost, setReportedPost] = useState(null)
  const [showCommentReportModal, setShowCommentReportModal] = useState(false)
  const [reportedComment, setReportedComment] = useState(null)
  const [reportEvidence, setReportEvidence] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportImageIndex, setReportImageIndex] = useState(0)
  const [userReports, setUserReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsFilter, setReportsFilter] = useState('all')
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [showSwitchingRolePopup, setShowSwitchingRolePopup] = useState(false)
  const [switchingRoleStep, setSwitchingRoleStep] = useState(0)
  const [featuredListings, setFeaturedListings] = useState([])
  const [featuredListingsLoading, setFeaturedListingsLoading] = useState(true)
  const [selectedFeaturedListing, setSelectedFeaturedListing] = useState(null)
  
  // Login toast state - now using sliding toast
  const [showLoginToast, setShowLoginToast] = useState(false)
  const [loginToastMessage, setLoginToastMessage] = useState('')
  const [loginToastRole, setLoginToastRole] = useState('')
  
  const dropdownRef = useRef(null)
  const markAsReadTimeoutRef = useRef(null)
  const router = useRouter()
  
  // Show login toast function - now using sliding toast
  const triggerLoginToast = (role, forceShow = false) => {
    // Check if toast was already shown in this session (unless forced)
    const sessionKey = `loginToastShown_${user?.uid}`
    if (!forceShow && sessionStorage.getItem(sessionKey)) {
      return
    }
    
    const messages = {
      crop_farmer: 'Welcome Crop Farmer! 🌾',
      livestock_owner: 'Welcome Livestock Owner! 🐄'
    }
    
    // Show sliding toast instead of modal popup
    setLoginToastMessage(messages[role] || 'Good day! Welcome to AgriLink!')
    setLoginToastRole(role)
    setShowLoginToast(true)
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowLoginToast(false)
    }, 5000)
    
    // Mark as shown for this session
    if (user?.uid) {
      sessionStorage.setItem(sessionKey, 'true')
    }
  }

  // Dismiss login toast
  const dismissLoginToast = () => {
    setShowLoginToast(false)
  }

  // Transaction completion confirmation modal

  // Use post handlers hook
  const { handleLikePost, handleAddComment: addComment, handleAddReply: addReply, formatTimeAgo } = usePostHandlers(user)

  // Handle image selection for post creation - accumulate like social media
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles(prev => [...prev, ...files])
    // Clear the input value to allow selecting the same file again if needed
    e.target.value = ''
  }

  // Remove all images for post creation
  const removeAllImages = () => {
    setImageFiles([])
    setImagePreviews([])
  }

  // Generate image previews when imageFiles change - accumulate like social media
  useEffect(() => {
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file))
    setImagePreviews(newPreviews)
    
    // Cleanup function to revoke object URLs when component unmounts or files change
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imageFiles])

  // Handle logout with custom confirmation modal
  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  // Confirm logout
  const confirmLogout = () => {
    signOut(auth).then(() => {
      router.push('/signin')
    }).catch((error) => {
      console.error('Error signing out:', error)
    })
  }

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  // Wrapper for handleAddComment with required parameters
  const handleAddComment = async () => {
    console.log('🎯 handleAddComment called')
    console.log('📝 Comment text:', commentText)
    console.log('📄 Selected post:', selectedPost?.id)
    console.log('👤 User:', user?.uid)
    
    if (!selectedPost) {
      console.error('❌ No selected post')
      return
    }
    
    if (!commentText.trim()) {
      console.error('❌ Comment text is empty')
      return
    }
    
    if (!user) {
      console.error('❌ No user logged in')
      return
    }
    
    console.log('✅ Validation passed, calling addComment...')
    setCommentLoading(true)
    try {
      const result = await addComment(selectedPost.id, commentText, user)
      console.log('✅ Comment added, result:', result)
      setCommentText('')
    } catch (error) {
      console.error('❌ Error in handleAddComment wrapper:', error)
      alert('Failed to add comment: ' + error.message)
    } finally {
      setCommentLoading(false)
    }
  }

  // Wrapper for handleAddReply with required parameters
  const handleAddReply = async (commentId, replyId = null) => {
    if (!selectedPost) return
    
    const replyText = replyId ? replyTextMap[replyId] : replyTextMap[commentId]
    if (!replyText?.trim()) return
    
    try {
      await addReply(selectedPost.id, commentId, replyText, user, replyId)
      // Clear the reply text
      setReplyTextMap(prev => ({ ...prev, [replyId || commentId]: '' }))
    } catch (error) {
      console.error('Error adding reply:', error)
    }
  }

  // Control body scroll based on active menu item
  useEffect(() => {
    if (activeMenuItem === 'listings' || activeMenuItem === 'listing-history' || activeMenuItem === 'reports' || activeMenuItem === 'profile' || activeMenuItem === 'chat' || activeMenuItem === 'transactions') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [activeMenuItem])

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
      
      console.log('🎉 All user data loaded successfully!')
      setIsInitialLoad(false)
      
    } catch (error) {
      console.error('❌ Error loading user data:', error)
      setIsInitialLoad(false)
    }
  }

  // Chat unread loading functionality removed - no longer needed
  // const loadUserChats = async (userId) => { ... }

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
          setNotificationsClosing(true)
          document.body.style.overflow = 'auto'
          setTimeout(() => {
            setShowNotifications(false)
            setNotificationsClosing(false)
          }, 200)
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
        if (showEditModal) {
          closeEditModal()
        }
      }
    }

    const handleClickOutside = (event) => {
      // Check if click is inside notifications dropdown or button
      const isInsideNotifications = event.target.closest(`.${styles.notificationsDropdown}`)
      const isInsideNotificationsButton = event.target.closest(`.${styles.notificationsButton}`)
      
      // Close dropdowns when clicking outside
      if (!isInsideNotifications && !isInsideNotificationsButton && !event.target.closest('.dropdown-container') && !event.target.closest('.menu-dropdown-container')) {
        setShowDropdown(null)
        if (showNotifications) {
          setNotificationsClosing(true)
          document.body.style.overflow = 'auto'
          setTimeout(() => {
            setShowNotifications(false)
            setNotificationsClosing(false)
          }, 200)
        }
                setShowProfileMenu(false)
        setShowMobileSearch(false)
        setShowMenuDropdown(false)
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
  }, [showCommentModal, showDropdown, showNotifications, showProfileMenu, showMobileSearch, showCommentMenu, editingComment, showMenuDropdown, showEditModal])

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
        
        // Get user role and data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            
            // Show login toast when role is determined
            if (userData.role) {
              triggerLoginToast(userData.role)
            }
            
            // Merge Firebase Auth user with Firestore user data
            setUser({
              ...currentUser,
              firstName: userData.firstName || currentUser.displayName?.split(' ')[0] || 'User',
              lastName: userData.lastName || currentUser.displayName?.split(' ')[1] || '',
              email: currentUser.email,
              uid: currentUser.uid,
              role: userData.role,
              profilePicture: userData.profilePicture || null
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
        setUnreadChats(0) // Re-added for proper cleanup
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

    return () => {
      unsubscribeAuth()
      if (unsubscribePosts) {
        unsubscribePosts()
      }
    }
  }, [router])

  // Separate useEffect for notification listener - depends on user state
  useEffect(() => {
    if (!user || !db) return

    console.log('🔔 Starting notification listener for user:', user.uid)
    
    const unsubscribeNotifications = listenToNotifications(user.uid, (notificationsList) => {
      console.log('🔔 Dashboard received notifications update:', notificationsList.length, 'notifications')
      console.log('🔔 Notification types:', notificationsList.map(n => ({ type: n.type, from: n.fromUserName, listingName: n.listingName })))
      setNotifications(notificationsList)
      const unreadNotifications = notificationsList.filter(n => !n.read)
      const newUnreadCount = unreadNotifications.length
      
      // Play sound and show visual feedback for new notifications (skip on initial load)
      if (!isInitialLoad && newUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
        console.log('🔔 New notification received! Playing sound...')
        playNotificationSound()
      }
      
      setUnreadCount(newUnreadCount)
      setPreviousUnreadCount(newUnreadCount)
      console.log('📊 Updated unread count to:', newUnreadCount)
    })

    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications()
      }
    }
  }, [user, isInitialLoad, previousUnreadCount])

  // Load featured listings for right sidebar (nearby listings for crop farmers, top listings for livestock owners)
  useEffect(() => {
    if (!db || !user) {
      console.log('⏸️ Featured listings useEffect skipped - missing db or user')
      return
    }

    console.log('🚀 Featured listings useEffect running for:', userRole)

    const loadFeaturedListings = async () => {
      setFeaturedListingsLoading(true)
      
      try {
        // For crop farmers, show 4 nearby listings with owner diversity
        if (userRole === 'crop_farmer') {
          const { getEnhancedLivestockListings } = await import('../utils/recommendationAlgorithm')
          const allListings = await getEnhancedLivestockListings()
          
          // Get crop farmer location
          const userDoc = await getDoc(doc(db, 'Users', user.uid))
          const userData = userDoc.data()
          
          if (userData.location) {
            // Calculate distance for each listing
            const listingsWithDistance = allListings
              .filter(listing => 
                listing.id && 
                listing.ownerId !== user.uid && // Exclude own listings
                listing.status !== 'sold' && 
                listing.status !== 'deleted'
              )
              .map(listing => {
                let distanceKm = null
                if (listing.ownerLocation) {
                  // Calculate distance using the same formula as recommendation algorithm
                  const calculateDistance = (lat1, lon1, lat2, lon2) => {
                    const R = 6371 // Earth's radius in km
                    const dLat = (lat2 - lat1) * Math.PI / 180
                    const dLon = (lon2 - lon1) * Math.PI / 180
                    const a = 
                      Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2)
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                    return R * c
                  }
                  
                  distanceKm = calculateDistance(
                    userData.location.latitude,
                    userData.location.longitude,
                    listing.ownerLocation.latitude,
                    listing.ownerLocation.longitude
                  )
                }
                return { 
                  ...listing, 
                  distanceKm,
                  category: listing.category || listing.type || 'other' // Normalize category field
                }
              })
              .filter(listing => listing.distanceKm !== null) // Only include listings with valid distance
            
            // Filter by maximum distance threshold (50km) to avoid showing too far listings
            const nearbyListings = listingsWithDistance.filter(listing => listing.distanceKm <= 50)
            
            // Group by ownerId to ensure we get different owners
            const ownerGroups = {}
            nearbyListings.forEach(listing => {
              if (!ownerGroups[listing.ownerId]) {
                ownerGroups[listing.ownerId] = []
              }
              ownerGroups[listing.ownerId].push(listing)
            })
            
            // Find the nearest listing from each unique owner
            const nearestByOwner = []
            Object.keys(ownerGroups).forEach(ownerId => {
              const ownerListings = ownerGroups[ownerId]
              const nearestListing = ownerListings.sort((a, b) => a.distanceKm - b.distanceKm)[0]
              nearestByOwner.push(nearestListing)
            })
            
            // Sort all nearest-by-owner listings by distance to get the overall nearest
            const sortedNearest = nearestByOwner.sort((a, b) => a.distanceKm - b.distanceKm)
            
            // Take the nearest 4 listings from different owners
            const finalSelection = sortedNearest.slice(0, 4)
            
            // Fallback: If fewer than 4 unique owners nearby, include more from slightly farther away
            if (finalSelection.length < 4 && listingsWithDistance.length > finalSelection.length) {
              const additionalOwners = listingsWithDistance
                .filter(listing => !finalSelection.some(selected => selected.ownerId === listing.ownerId))
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, 4 - finalSelection.length)
              finalSelection.push(...additionalOwners)
            }
            
            // Fetch owner ratings for each listing
            const listingsWithRatings = await Promise.all(
              finalSelection.map(async (listing) => {
                if (listing.ownerId) {
                  try {
                    const ownerDoc = await getDoc(doc(db, 'Users', listing.ownerId))
                    if (ownerDoc.exists()) {
                      const ownerData = ownerDoc.data()
                      return {
                        ...listing,
                        ownerRating: ownerData.rating || 0
                      }
                    }
                  } catch (error) {
                    console.warn(`Failed to fetch rating for owner ${listing.ownerId}:`, error)
                  }
                }
                return { ...listing, ownerRating: null }
              })
            )
            
            console.log('🎯 Featured nearby listings selected:', {
              total: listingsWithRatings.length,
              categories: listingsWithRatings.map(l => l.category),
              distances: listingsWithRatings.map(l => `${l.distanceKm?.toFixed(1)}km`)
            })
            
            setFeaturedListings(listingsWithRatings)
          } else {
            // If no location, show empty state
            setFeaturedListings([])
          }
        } else if (userRole === 'livestock_owner') {
          // For livestock owners, show their top 4 listings by request count
          const listingsQuery = query(
            collection(db, 'livestock_listings'),
            where('ownerId', '==', user.uid)
          )
          
          const snapshot = await getDocs(listingsQuery)
          const allListings = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }))
          
          // Filter out sold and deleted listings
          const availableListings = allListings.filter(
            listing => listing.status !== 'sold' && listing.status !== 'deleted'
          )
          
          if (availableListings.length === 0) {
            setFeaturedListings([])
            return
          }
          
          // Count requests for each available listing
          const listingsWithRequests = await Promise.all(
            availableListings.map(async (listing) => {
              const requestsQuery = query(
                collection(db, 'listing_requests'),
                where('listingId', '==', listing.id)
              )
              const requestsSnapshot = await getDocs(requestsQuery)
              const requestCount = requestsSnapshot.size
              
              return {
                ...listing,
                requestCount,
                ownerRating: 0
              }
            })
          )
          
          // Sort by request count (highest first), then by creation date (newest first)
          const topListings = listingsWithRequests
            .sort((a, b) => {
              if (b.requestCount !== a.requestCount) {
                return b.requestCount - a.requestCount
              }
              const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
              const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
              return bTime - aTime
            })
            .slice(0, 4)
          
          setFeaturedListings(topListings)
        } else {
          setFeaturedListings([])
        }
      } catch (error) {
        console.error('Error fetching featured listings:', error)
      } finally {
        setFeaturedListingsLoading(false)
      }
    }

    loadFeaturedListings()
  }, [user, userRole, db])

  // Handle logout functionality
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
    console.log('🚀 handlePost called')
    console.log('📝 postText:', postText?.trim())
    console.log('🖼️ imageFiles length:', imageFiles?.length)
    console.log('👤 user:', user?.uid)
    console.log('🔥 db initialized:', !!db)
    
    if ((!postText.trim() && imageFiles.length === 0) || !user || !db) {
      console.log('❌ Validation failed - returning early')
      return
    }

    console.log('✅ Validation passed - setting loading to true')
    setLoading(true)
    try {
      let imageUrls = []
      
      // Upload multiple images to Firebase Storage if selected
      if (imageFiles.length > 0) {
        console.log('📤 Starting image upload to Firebase Storage...')
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i]
          console.log(`📤 Uploading image ${i + 1}/${imageFiles.length}:`, imageFile.name)
          try {
            const imageUrl = await uploadImageToFirebaseStorage(imageFile, 'Images/Feed', user.uid)
            imageUrls.push(imageUrl)
            console.log(`✅ Image ${i + 1} uploaded successfully:`, imageUrl)
          } catch (uploadError) {
            console.error(`❌ Image ${i + 1} upload failed:`, uploadError)
            throw new Error(`Image upload failed: ${uploadError.message}`)
          }
        }
      }

      console.log('💾 Saving post to Firestore...')
      
      // Create post with multiple images support
      const postData = {
        text: postText.trim(),
        userId: user.uid,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || user.email?.split('@')[0] || 'AgriLink User',
        userEmail: user.email,
        userProfilePicture: user.profilePicture || null,
        imageUrls: imageUrls,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null, // Keep backward compatibility
        likes: [], // Array of user IDs who liked
        likesCount: 0, // Count for display
        likedBy: [], // Backward compatibility
        comments: [],
        commentsCount: 0, // Count for display
        createdAt: serverTimestamp(),
      }
      
      console.log('📝 Post data prepared:', postData)
      
      const docRef = await addDoc(collection(db, 'Posts'), postData)
      console.log('✅ Post created successfully with ID:', docRef.id)
      
      setPostText('')
      removeAllImages()
      closePostModal()
    } catch (error) {
      console.error('❌ Error creating post:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      alert(`Failed to create post: ${error.message}`)
    } finally {
      console.log('🔄 Setting loading to false')
      setLoading(false)
    }
  }

  // handleLikePost moved to PostHandlers.js

  // Format time ago (same as mobile app)
  // formatTimeAgo moved to PostHandlers.js

  // Format listing time for featured listings
  const formatListingTime = (timestamp) => {
    if (!timestamp) return "New"
    
    const now = new Date()
    let listingTime
    
    if (timestamp.toDate) {
      listingTime = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      listingTime = timestamp
    } else if (timestamp.seconds) {
      listingTime = new Date(timestamp.seconds * 1000)
    } else {
      listingTime = new Date(timestamp)
    }
    
    if (isNaN(listingTime.getTime())) {
      return "New"
    }
    
    const diffInMinutes = Math.floor((now - listingTime) / (1000 * 60))
    
    if (diffInMinutes < 10) return "New"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return listingTime.toLocaleDateString()
  }

  const hasUserLiked = (post) => {
    // Check both 'likes' and 'likedBy' for backward compatibility
    // Ensure likes/likedBy are arrays before calling includes
    const likesArray = Array.isArray(post.likes) ? post.likes : [];
    const likedByArray = Array.isArray(post.likedBy) ? post.likedBy : [];
    return likesArray.includes(user?.uid) || likedByArray.includes(user?.uid);
  }

  // Calculate total comment count including replies
  const getTotalCommentCount = (post) => {
    if (!post.comments || post.comments.length === 0) return 0
    
    let total = post.comments.length
    
    // Add reply counts
    post.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        total += comment.replies.length
      }
    })
    
    return total
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

  // handleAddComment moved to PostHandlers.js
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
  // handleAddReply moved to PostHandlers.js

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
      // Upload new images to Firebase Storage
      const newImageUrls = []
      if (editImageFiles.length > 0) {
        console.log('Uploading new images for edit...')
        for (const file of editImageFiles) {
          const imageUrl = await uploadImageToFirebaseStorage(file, 'Images/Feed', user.uid)
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

  // Handle delete post with scroll position preservation
  const handleDeletePost = (postId) => {
    // Save current scroll position
    const scrollPosition = window.scrollY
    window.currentScrollPosition = scrollPosition
    
    setPostToDelete(postId)
    setShowDeleteModal(true)
    setShowDropdown(null)
    // Prevent all scrolling and maintain visual position
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = `-${scrollPosition}px`
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
      document.body.style.top = 'unset'
      
      // Restore scroll position using requestAnimationFrame for better timing
      if (window.currentScrollPosition !== undefined) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, window.currentScrollPosition)
            delete window.currentScrollPosition
          })
        })
      }
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
    document.body.style.top = 'unset'
    
    // Restore scroll position immediately since no re-render needed
    if (window.currentScrollPosition !== undefined) {
      window.scrollTo(0, window.currentScrollPosition)
      delete window.currentScrollPosition
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

  const handleReportComment = (commentId) => {
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

    // Set up comment data for ReportModal
    setReportedComment({
      id: targetComment.id,
      text: targetComment.text,
      content: targetComment.text,
      userId: targetComment.userId,
      userName: targetComment.userName || targetComment.userEmail || 'Unknown',
      postId: targetPost.id
    })
    setShowCommentReportModal(true)
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
      
      // Show success toast
      showSuccessPopup(`Comment ${isOwnComment ? '' : `by ${commentToDelete?.userName || 'user'} `}deleted successfully`)
      
    } catch (error) {
      console.error('Error deleting comment:', error)
      showErrorPopup(`Failed to delete comment: ${error.message}`)
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
      showSuccessPopup('Comment updated successfully')
    } catch (error) {
      console.error('Error editing comment:', error)
      showErrorPopup('Failed to edit comment. Please try again.')
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
      showSuccessPopup('Reply deleted successfully')
      
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
    setReportedPost(null)
  }

  const closeCommentReportModal = () => {
    setShowCommentReportModal(false)
    setReportedComment(null)
  }

  // Handle ESC key and click outside to close search panel
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showSearchPanel) {
        setShowSearchPanel(false)
        setSearchQuery('')
        setSearchSubmitted(false)
        setSearchResults([])
      }
    }

    const handleClickOutside = (event) => {
      if (showSearchPanel) {
        const searchPanel = document.querySelector(`.${styles.searchPanel}`)
        const searchMenuItem = event.target.closest(`.${styles.leftMenuItem}`)
        
        // Close if clicked outside search panel and not on the search menu item
        if (searchPanel && !searchPanel.contains(event.target) && !searchMenuItem) {
          setShowSearchPanel(false)
          setSearchQuery('')
          setSearchSubmitted(false)
          setSearchResults([])
        }
      }
    }

    if (showSearchPanel) {
      document.addEventListener('keydown', handleEscapeKey)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchPanel])

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
      console.log('Auto-captured data:', {
        userID: reportData.reporterId,
        reportedUserID: reportData.reportedUserId,
        postID: reportData.postId,
        caption: reportData.postContent,
        photo: reportData.postImageUrl,
        video: reportData.postVideoUrl,
        reportType: reportData.reportType,
        description: reportData.description
      })

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

    const currentUser = auth?.currentUser
    console.log('auth.currentUser:', currentUser)
    console.log('React user state:', user)
    console.log('Current userRole state:', userRole)

    if (!currentUser) {
      showErrorPopup('Please log in first')
      return
    }

    const currentRole = userRole || 'crop_farmer'
    const newRole = currentRole === 'livestock_owner' ? 'crop_farmer' : 'livestock_owner'
    const roleNames = {
      livestock_owner: 'Livestock Owner',
      crop_farmer: 'Crop Farmer'
    }

    console.log('Switching from:', currentRole, 'to:', newRole)

    const confirmed = await showConfirmPopup(
      'Switch Role',
      `Are you sure you want to switch ${userRole ? `from ${roleNames[currentRole]} ` : ''}to ${roleNames[newRole]}?`
    )

    if (!confirmed) return

    try {
      console.log('Updating Firestore role...')

      const userRef = doc(db, 'Users', currentUser.uid)

      // Get current user data to check onboarding status BEFORE updating role
      const userDoc = await getDoc(userRef)
      const userData = userDoc.exists() ? userDoc.data() : {}
      const onboarding = userData.onboarding || {}

      // Check if user already has onboarding data for target role
      let shouldSkipOnboarding = false
      const bothCompleted = onboarding.livestockOnboardingCompleted && onboarding.cropOnboardingCompleted
      
      if (bothCompleted) {
        console.log('✅ User completed both onboardings, skipping all setup')
        shouldSkipOnboarding = true
      } else if (newRole === 'livestock_owner' && onboarding.livestockOnboardingCompleted) {
        console.log('✅ User already completed livestock onboarding, skipping to dashboard')
        shouldSkipOnboarding = true
      } else if (newRole === 'crop_farmer' && onboarding.cropOnboardingCompleted) {
        console.log('✅ User already completed crop farmer onboarding, skipping to dashboard')
        shouldSkipOnboarding = true
      }

      await updateDoc(userRef, {
        role: newRole,
        previousRole: currentRole,
        roleUpdatedAt: serverTimestamp()
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          console.log('Creating new user document while switching role...')
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            firstName: user?.firstName || currentUser.displayName?.split(' ')[0] || 'User',
            lastName: user?.lastName || currentUser.displayName?.split(' ')[1] || '',
            role: newRole,
            previousRole: currentRole,
            roleUpdatedAt: serverTimestamp()
          })
        } else {
          throw error
        }
      })

      // Show loading popup with steps
      setShowSwitchingRolePopup(true)
      
      // Simulate loading steps
      const steps = ['feed', 'listing', 'chats', 'profile']
      for (let i = 0; i < steps.length; i++) {
        setSwitchingRoleStep(i)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Refresh local role state
      setUserRole(newRole)
      console.log('Role successfully updated to:', newRole)
      
      // Hide loading popup
      setShowSwitchingRolePopup(false)
      setSwitchingRoleStep(0)
      
      // Show welcome toast for the new role
      triggerLoginToast(newRole, true)

      // If user already completed onboarding for target role, stay on dashboard
      if (shouldSkipOnboarding) {
        console.log('Target role onboarding already completed, staying on dashboard')
        setActiveMenuItem('home')
        const action = newRole === 'crop_farmer' ? 'search for listings' : 'add listings'
        showSuccessPopup('Role Changed', `You are now a ${roleNames[newRole]}!\nYou can now ${action}.`)
        return
      }

      // User needs to complete onboarding for new role
      console.log('Target role onboarding not completed yet, redirecting to onboarding flow...')
      
      // Skip location permission and role selection for role switchers
      // They already have an account and just need to complete the other role's onboarding
      if (newRole === 'livestock_owner') {
        router.push('/livestock-onboarding')
      } else if (newRole === 'crop_farmer') {
        router.push('/crop-onboarding')
      }

      showInfoPopup(`Successfully switched to ${roleNames[newRole]}! Please complete the setup process.`)
    } catch (error) {
      console.error('Error switching role:', error)
      setShowSwitchingRolePopup(false)
      setSwitchingRoleStep(0)
      showErrorPopup('Failed to switch role. Please try again.')
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
    
    // Close with animation
    setNotificationsClosing(true)
    setTimeout(() => {
      setShowNotifications(false)
      setNotificationsClosing(false)
    }, 200)
    
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
      case 'comment_reply':
        // Find and open the post in comment modal
        if (notification.postId) {
          console.log('Looking for post with ID:', notification.postId)
          // First, make sure we're on the feed
          setActiveMenuItem('home')
          
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
                alert('This post may have been deleted.')
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
        // Navigate to chat - Chat component will handle the conversation loading
        setActiveMenuItem('chat')
        setShowNotifications(false)
        break
      case 'report_status':
        // Show report details in an alert/modal
        const reportMessage = `Report Status: ${notification.reportStatus || 'Under Review'}\n\nReason: ${notification.reportReason || 'Not specified'}\n\n${notification.reportDetails || notification.message}`
        alert(reportMessage)
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

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Search functionality
  const handleSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchQuery('')
      setSearchSubmitted(false)
      return
    }

    // Search through posts
    const results = posts.filter(post => {
      const searchLower = query.toLowerCase()
      return (
        post.text?.toLowerCase().includes(searchLower) ||
        post.content?.toLowerCase().includes(searchLower) ||
        post.userName?.toLowerCase().includes(searchLower)
      )
    })

    setSearchResults(results)
    setSearchSubmitted(true)

    // Save to recent searches
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }

    // Close search panel after search
    setShowSearchPanel(false)
  }

  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    // Reset search submitted state when user types new query
    if (searchSubmitted) {
      setSearchSubmitted(false)
      setSearchResults([])
    }
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSearch(searchQuery)
    }
  }

  const handleRecentSearchClick = (search) => {
    setSearchQuery(search)
    handleSearch(search)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

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
              
              <div className={styles.profileMenuItem} onClick={() => {
                setShowProfileMenu(false)
                handleLogout()
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
                // Navigate to home/dashboard and clear search
                setActiveMenuItem('home')
                setSearchResults([])
                setSearchQuery('')
                setSearchSubmitted(false)
                setShowSearchPanel(false)
                console.log('Home clicked - Feed reloaded')
              }}>
                <img src={activeMenuItem === 'home' ? "/assets/icons/home-white.png" : "/assets/icons/home.png"} alt="Home" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Home</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${showSearchPanel ? styles.active : ''}`} onClick={() => {
                setShowSearchPanel(true)
                setActiveMenuItem('') // Clear active menu item
                console.log('Search clicked')
              }}>
                <img src={showSearchPanel ? "/assets/icons/search-white.png" : "/assets/icons/search.png"} alt="Search" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Search</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'chat' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('chat')
                setShowSearchPanel(false)
                console.log('Chat clicked')
              }}>
                <img src={activeMenuItem === 'chat' ? "/assets/icons/chat-white.png" : "/assets/icons/chat.png"} alt="Chat" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Chat</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'listings' ? styles.active : ''}`} onClick={() => {
                setSelectedFeaturedListing(null) // Clear any selected featured listing
                setActiveMenuItem('listings')
                setShowSearchPanel(false)
                console.log('Listings clicked')
              }}>
                <img src={activeMenuItem === 'listings' ? "/assets/icons/listing-white.png" : "/assets/icons/listing.png"} alt="Listings" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Listings</span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'listing-history' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('listing-history')
                setShowSearchPanel(false)
                console.log('Listing History clicked')
              }}>
                <img src={activeMenuItem === 'listing-history' ? "/assets/icons/time-past-white.png" : "/assets/icons/time-past.png"} alt="Listing History" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>
                  {userRole === 'crop_farmer' ? 'Request Listing History' : 'Listing History'}
                </span>
              </div>
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'transactions' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('transactions')
                setShowSearchPanel(false)
                console.log('Transactions clicked')
              }}>
                <img src={activeMenuItem === 'transactions' ? "/assets/icons/scroll-text-white.png" : "/assets/icons/scroll-text.png"} alt="Transactions" className={styles.leftMenuIcon} />
                <span className={styles.leftMenuText}>Transactions</span>
              </div>
              
              
              
              <div className={`${styles.leftMenuItem} ${activeMenuItem === 'profile' ? styles.active : ''}`} onClick={() => {
                setActiveMenuItem('profile')
                setShowSearchPanel(false)
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
                      console.log('Switch Role clicked')
                      setShowMenuDropdown(false)
                      handleSwitchRole()
                    }}>
                      <img src="/assets/icons/rotate-reverse.png" alt="Switch Role" className={styles.menuDropdownIcon} />
                      <span>Switch Role</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('Account Settings clicked')
                      setShowMenuDropdown(false)
                      router.push('/account-settings')
                    }}>
                      <img src="/assets/icons/settings.png" alt="Account Settings" className={styles.menuDropdownIcon} />
                      <span>Account Settings</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('My Reports clicked')
                      setActiveMenuItem('reports')
                      setShowMenuDropdown(false)
                    }}>
                      <img src="/assets/icons/triangle-warning.png" alt="My Reports" className={styles.menuDropdownIcon} />
                      <span>My Reports</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('Privacy Policy clicked')
                      setShowMenuDropdown(false)
                      router.push('/privacy-policy')
                    }}>
                      <img src="/assets/icons/shield.png" alt="Privacy Policy" className={styles.menuDropdownIcon} />
                      <span>Privacy Policy</span>
                    </div>
                    
                    <div className={styles.menuDropdownItem} onClick={() => {
                      console.log('About clicked')
                      setShowMenuDropdown(false)
                      router.push('/about')
                    }}>
                      <img src="/assets/icons/info.png" alt="About" className={styles.menuDropdownIcon} />
                      <span>About</span>
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

        {/* Search Panel */}
        {showSearchPanel && (
          <div className={styles.searchPanel}>
            <div className={styles.searchPanelHeader}>
              <button onClick={() => {
                setShowSearchPanel(false)
                setSearchQuery('')
                setSearchSubmitted(false)
                setSearchResults([])
              }} className={styles.searchBackButton}>
                <img src="/assets/icons/back.png" alt="Back" className={styles.backIcon} />
              </button>
              <input
                type="text"
                placeholder="Search posts... (Press Enter)"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
                className={styles.searchInput}
                autoFocus
              />
            </div>

            <div className={styles.searchPanelContent}>
              {/* Show recent searches */}
              <div className={styles.recentSearches}>
                <div className={styles.recentSearchesHeader}>
                  <h3>Recent Searches</h3>
                  {recentSearches.length > 0 && (
                    <button onClick={clearRecentSearches} className={styles.clearButton}>
                      Clear All
                    </button>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <p className={styles.emptyMessage}>No recent searches</p>
                ) : (
                  <div className={styles.recentSearchList}>
                    {recentSearches.map((search, index) => (
                      <div
                        key={index}
                        className={styles.recentSearchItem}
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        <img src="/assets/icons/search.png" alt="Search" className={styles.searchItemIcon} />
                        <span>{search}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Screen - Full Screen */}
        {activeMenuItem === 'chat' && (
          <Chat 
            user={user} 
            userRole={userRole} 
            setActiveMenuItem={setActiveMenuItem} 
            onUnreadChatsUpdate={setUnreadChats} 
          />
        )}

        {/* Floating Notifications Button - Hidden when chat is active */}
        {activeMenuItem !== 'chat' && (
          <div className={styles.floatingNotifications}>
            <div 
              className={styles.notificationsButton}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (showNotifications) {
                  // Trigger closing animation
                  setNotificationsClosing(true)
                  document.body.style.overflow = 'auto'
                  // Wait for animation to complete before hiding
                  setTimeout(() => {
                    setShowNotifications(false)
                    setNotificationsClosing(false)
                  }, 200) // Match animation duration
                } else {
                  // Open notifications
                  setShowNotifications(true)
                  setNotificationsClosing(false)
                  document.body.style.overflow = 'auto'
                }
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
              className={`${styles.notificationsDropdown} ${notificationsClosing ? styles.closing : ''}`}
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
                            {notification.type === 'listing_request' ? (
                              `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'A crop farmer'} is interested in your listing: ${notification.listingName || 'your listing'}`
                            ) : notification.type === 'report_status' ? (
                              `${notification.message || 'Your content has been reported'}`
                            ) : notification.type === 'comment_reply' ? (
                              `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'Someone'} replied to your comment`
                            ) : (
                              `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'AgriLink User'} ${notification.actionText || (notification.actionType === 'like' ? 'liked your post' : 'commented on your post')}`
                            )}
                          </span>
                        </div>
                        {notification.type === 'report_status' && notification.reportReason && (
                          <div className={styles.notificationSubText}>
                            <span style={{ fontSize: '12px', color: '#e74c3c' }}>Reason: {notification.reportReason}</span>
                          </div>
                        )}
                        <div className={styles.notificationTimeLine}>
                          <span className={styles.notificationTime}>
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.notificationIcon}>
                        {notification.type === 'listing_request' ? (
                          <img src="/assets/icons/listing.png" alt="Listing Request" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                        ) : notification.type === 'report_status' ? (
                          <img src="/assets/icons/triangle-warning.png" alt="Report" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                        ) : notification.type === 'comment_reply' ? (
                          <img src="/assets/icons/comment-all-dots.png" alt="Reply" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                        ) : notification.actionType === 'like' ? (
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
        )}

        {/* Main Feed - Hide when listings, listing-history, reports, profile, chat, or transactions is active */}
        {activeMenuItem !== 'listings' && activeMenuItem !== 'listing-history' && activeMenuItem !== 'reports' && activeMenuItem !== 'profile' && activeMenuItem !== 'chat' && activeMenuItem !== 'transactions' && (
        <main className={styles.mainFeed}>
          {/* Post Creation Prompt - Only show when not viewing reports, listings, profile, chat, or search results */}
          {activeMenuItem !== 'reports' && activeMenuItem !== 'listings' && activeMenuItem !== 'profile' && activeMenuItem !== 'chat' && !searchSubmitted && (
            <div className={styles.postPromptContainer}>
              <div className={styles.postPrompt}>
                <div className={styles.userAvatar}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    user?.firstName ? user.firstName[0].toUpperCase() : 'U'
                  )}
                </div>
                <div className={styles.clickableTextBox} onClick={openPostModal}>
                  {userRole === 'crop_farmer' ? 'As a Crop Farmer, what\'s on your mind?' : userRole === 'livestock_owner' ? 'As a Livestock Owner, what\'s on your mind?' : 'What\'s on your mind?'}
                </div>
              </div>
            </div>
          )}


          {/* News Feed / Reports / Listings */}
          <div className={styles.newsFeed}>
            {/* Search Results Banner - Only show after user presses Enter */}
            {searchSubmitted && searchQuery.trim() !== '' && (
              <div className={styles.searchResultsBanner}>
                <div className={styles.searchResultsHeader}>
                  <h3>Search Results for "{searchQuery}"</h3>
                </div>
                <p className={styles.searchResultsCount}>
                  {searchResults.length > 0 
                    ? `${searchResults.length} post(s) found` 
                    : `No results for "${searchQuery}"`}
                </p>
              </div>
            )}

            {activeMenuItem === 'listings' ? (
              // Direct Listings Component Integration
              <Listings />
            ) : (
              // Regular Posts Feed or Search Results - only show search results after Enter is pressed
              (searchSubmitted && searchResults.length > 0 ? searchResults : 
               searchSubmitted && searchResults.length === 0 ? [] : 
               posts)
              .filter(post => {
                // Hide posts with valid report verdict from public
                console.log('🔍 Filtering post:', {
                  postId: post.id,
                  reportVerdict: post.reportVerdict,
                  postUserId: post.userId,
                  currentUserId: user?.uid,
                  shouldHide: post.reportVerdict === 'VALID' && post.userId !== user?.uid
                })
                if (post.reportVerdict === 'VALID' && post.userId !== user?.uid) {
                  console.log('🚫 Hiding post with valid report:', post.id)
                  return false
                }
                return true
              })
              .map((post) => {
                // Check if post is hidden due to valid report
                const isHiddenPost = post.reportVerdict === 'VALID' && post.userId === user?.uid
                return (
              <div 
                key={post.id} 
                className={styles.post}
                style={isHiddenPost ? { opacity: 0.5 } : {}}
              >
                <div className={styles.postHeader}>
                  <div className={styles.postAvatar}>
                    {post.userProfilePicture ? (
                      <img src={post.userProfilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      post.userName ? post.userName[0].toUpperCase() : 'U'
                    )}
                  </div>
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
                  <span>{post.likesCount || post.likes?.length || 0} {(post.likesCount || post.likes?.length || 0) === 1 ? 'like' : 'likes'}</span>
                  <span>{getTotalCommentCount(post)} {getTotalCommentCount(post) === 1 ? 'comment' : 'comments'}</span>
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
                )
              })
            )}
          </div>
        </main>
        )}

        {/* Right Sidebar - Featured Listings (always show on home feed or when search panel is open, hide only on other screens) */}
        {(activeMenuItem === 'home' || activeMenuItem === '' || showSearchPanel) && !searchSubmitted && (
          <aside 
            className={styles.rightSidebar}
            onMouseEnter={() => {
              document.body.style.overflow = 'hidden'
            }}
            onMouseLeave={() => {
              if (activeMenuItem === 'home' || activeMenuItem === '' || showSearchPanel) {
                document.body.style.overflow = 'auto'
              }
            }}
          >
            <div className={styles.featuredListingsCard}>
              <div className={styles.featuredListingsHeader}>
                <h3 className={styles.featuredListingsTitle}>
                  {userRole === 'livestock_owner' ? 'Your Top Listings' : 'Featured Listings'}
                </h3>
                {userRole !== 'livestock_owner' && (
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => {
                      setSelectedFeaturedListing(null)
                      setActiveMenuItem('listings')
                    }}
                  >
                    View All
                  </button>
                )}
              </div>
              
              {featuredListingsLoading ? (
                <div className={styles.featuredListingsLoading}>
                  <div className={styles.featuredListingsSpinner}></div>
                </div>
              ) : featuredListings.length === 0 ? (
                <div className={styles.featuredListingsEmpty}>
                  <img 
                    src="/assets/icons/trophy.png" 
                    alt="No listings" 
                    className={styles.featuredListingsEmptyIcon}
                  />
                  <p className={styles.featuredListingsEmptyText}>
                    {userRole === 'livestock_owner' 
                      ? 'No listings with requests yet. Your most requested listings will be shown here.' 
                      : 'No listings available yet'
                    }
                  </p>
                </div>
              ) : (
                <div className={styles.featuredListingsList}>
                  {featuredListings.map((listing) => (
                    <div 
                      key={listing.id} 
                      className={styles.featuredListingItem}
                      onClick={() => {
                        setSelectedFeaturedListing(listing)
                        setActiveMenuItem('listings')
                      }}
                    >
                      <img 
                        src={listing.images?.[0] || listing.imageUrls?.[0] || listing.imageUrl || listing.image || listing.photo || listing.photoUrl || listing.photos?.[0] || '/assets/images/placeholder-listing.png'} 
                        alt={listing.name}
                        className={styles.featuredListingImage}
                        onError={(e) => {
                          e.target.src = '/assets/icons/listing.png'
                        }}
                      />
                      <div className={styles.featuredListingInfo}>
                        <div className={styles.featuredListingNameRow}>
                          <h4 className={styles.featuredListingName}>
                            {listing.name?.length > 20 
                              ? listing.name.substring(0, 20) + '...' 
                              : listing.name || 'Unnamed Listing'}
                          </h4>
                          {listing.distanceKm != null && (
                            <span className={styles.featuredListingDistance}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill={listing.distanceKm < 5 ? "#2d5a27" : "#fa9100"} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '2px', flexShrink: 0 }}>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                              </svg>
                              <span style={{ color: listing.distanceKm < 5 ? '#2d5a27' : '#fa9100', fontWeight: listing.distanceKm < 5 ? '600' : 'normal' }}>
                                {listing.distanceKm < 5 ? 'Nearby' : `${listing.distanceKm.toFixed(1)} km`}
                              </span>
                            </span>
                          )}
                        </div>
                        <p className={styles.featuredListingPrice}>
                          {listing.isFree ? 'Free' : listing.price ? `₱${listing.price}` : 'Contact for price'}
                        </p>
                        <div className={styles.featuredListingMeta}>
                          {userRole === 'livestock_owner' && listing.requestCount != null ? (
                            <>
                              <span className={styles.featuredListingRequests}>
                                📋 {listing.requestCount} {listing.requestCount === 1 ? 'request' : 'requests'}
                              </span>
                              <span className={styles.featuredListingDot}>•</span>
                              <span className={`${styles.featuredListingTime} ${formatListingTime(listing.createdAt) === 'New' ? styles.newListing : ''}`}>
                                {formatListingTime(listing.createdAt)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={styles.featuredListingOwner}>
                                {listing.ownerName?.split(' ')[0] || 'Owner'}
                              </span>
                              <span className={styles.featuredListingDot}>•</span>
                              <span className={styles.featuredListingRating}>
                                ⭐ {typeof listing.ownerRating === 'number' ? listing.ownerRating.toFixed(1) : '0.0'}
                              </span>
                              <span className={styles.featuredListingDot}>•</span>
                              <span className={`${styles.featuredListingTime} ${formatListingTime(listing.createdAt) === 'New' ? styles.newListing : ''}`}>
                                {formatListingTime(listing.createdAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Listings Screen - Separate from main feed */}
        {activeMenuItem === 'listings' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Listings 
              initialSelectedListing={selectedFeaturedListing}
              onClearSelectedListing={() => setSelectedFeaturedListing(null)}
              key={selectedFeaturedListing?.id || 'listings'}
            />
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

        {/* Reports Screen - Separate from main feed */}
        {activeMenuItem === 'reports' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            marginLeft: '0',
            position: 'relative'
          }}>
            <Reports />
          </div>
        )}

        {/* Transactions Screen - Separate from main feed */}
        {activeMenuItem === 'transactions' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            marginLeft: '0',
            position: 'relative'
          }}>
            {userRole === 'crop_farmer' ? (
            <CropfarmerTransactions user={user} />
          ) : (
            <Transactions user={user} />
          )}
          </div>
        )}

        {/* Profile Screen - Full width, separate from main feed */}
        {activeMenuItem === 'profile' && (
          <div style={{ 
            width: '100%', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            marginLeft: '250px',
            position: 'relative',
            overflow: 'auto'
          }}>
            <UserProfile />
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
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      user?.firstName ? user.firstName[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <span className={styles.modalUserName}>
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                
                <div className={styles.modalBody}>
                  <textarea
                    value={postText}
                    onChange={handleTextChange}
                    placeholder={userRole === 'crop_farmer' ? 'As a Crop Farmer, what\'s on your mind?' : userRole === 'livestock_owner' ? 'As a Livestock Owner, what\'s on your mind?' : 'What\'s on your mind?'}
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
                    {editingPost.userProfilePicture ? (
                      <img src={editingPost.userProfilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      editingPost.userName ? editingPost.userName[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <span className={styles.modalUserName}>
                    {editingPost.userName}
                  </span>
                </div>
                
                <div className={styles.modalBody}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder={userRole === 'crop_farmer' ? 'As a Crop Farmer, what\'s on your mind?' : userRole === 'livestock_owner' ? 'As a Livestock Owner, what\'s on your mind?' : 'What\'s on your mind?'}
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

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div 
            className={styles.modalOverlay} 
            onClick={cancelLogout}
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
                <h3>Logout</h3>
              </div>
              
              <div className={styles.deleteModalContent}>
                <p>Are you sure you want to logout?</p>
              </div>
              
              <div className={styles.deleteModalFooter}>
                <button
                  onClick={cancelLogout}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className={styles.deleteBtn}
                >
                  Logout
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
                    {selectedPost.userProfilePicture ? (
                      <img src={selectedPost.userProfilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      selectedPost.userName ? selectedPost.userName[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <div className={styles.modalPostAuthor}>{selectedPost.userName}</div>
                    <div className={styles.modalPostTime}>{formatTimeAgo(selectedPost.createdAt)}</div>
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
                <span>{selectedPost?.likesCount || selectedPost?.likes?.length || 0} {(selectedPost?.likesCount || selectedPost?.likes?.length || 0) === 1 ? 'like' : 'likes'}</span>
                <span>{getTotalCommentCount(selectedPost)} {getTotalCommentCount(selectedPost) === 1 ? 'comment' : 'comments'}</span>
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
                  selectedPost.comments
                    .filter(comment => {
                      // Hide comments with valid report verdict from public
                      if (comment.reportVerdict === 'VALID' && comment.userId !== user?.uid && comment.userEmail !== user?.email) {
                        return false
                      }
                      return true
                    })
                    .map((comment, index) => {
                    const commentId = comment.id || comment.commentId || `comment-${index}-${comment.text?.substring(0, 10)}`
                    // Check if comment is hidden due to valid report
                    const isHiddenComment = comment.reportVerdict === 'VALID' && (comment.userId === user?.uid || comment.userEmail === user?.email)
                    return (
                      <div 
                        key={commentId} 
                        className={styles.modalComment} 
                        data-comment-id={commentId}
                        style={isHiddenComment ? { opacity: 0.5 } : {}}
                      >
                        <div className={styles.commentAvatar}>
                          {comment.userProfilePicture ? (
                            <img src={comment.userProfilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            comment.userName ? comment.userName[0].toUpperCase() : 'U'
                          )}
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
                            <div className={styles.commentContent}>
                              {/* Bubble with menu button - fixed position */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, position: 'relative' }}>
                                <div className={styles.commentBubble}>
                                  <span className={styles.commentAuthor}>{comment.userName}</span>
                                  <p className={styles.commentText}>
                                    {comment.text}
                                    {comment.editedAt && <span className={styles.editedIndicator}> (edited)</span>}
                                  </p>
                                </div>
                                {/* Menu button right next to bubble - ALWAYS VISIBLE */}
                                <div style={{ position: 'relative' }}>
                                  <button 
                                    className={styles.commentMenuBtn}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('🔘 Comment menu button clicked for:', commentId)
                                      setShowCommentMenu(showCommentMenu === commentId ? null : commentId)
                                    }}
                                  >
                                    ⋯
                                  </button>
                                  {/* Dropdown menu - positioned relative to button */}
                                  {showCommentMenu === commentId && (
                                    <div 
                                      className={styles.commentDropdown}
                                      style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        zIndex: 999999,
                                        backgroundColor: 'white',
                                        border: '1px solid #e4e6ea',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                        minWidth: '120px'
                                      }}
                                    >
                                      {(() => {
                                        console.log('🔍 Dropdown rendering for comment:', commentId)
                                        console.log('🔍 Comment userId:', comment.userId, 'User uid:', user?.uid)
                                        console.log('🔍 Comment userEmail:', comment.userEmail, 'User email:', user?.email)
                                        const isOwner = comment.userId === user?.uid || (!comment.userId && comment.userEmail === user?.email)
                                        console.log('🔍 Is owner?', isOwner)
                                        return null
                                      })()}
                                      {(comment.userId === user?.uid || (!comment.userId && comment.userEmail === user?.email)) ? (
                                        <>
                                          <button onClick={() => handleEditComment(comment)} className={styles.commentMenuItem}>Edit</button>
                                          <button onClick={() => handleDeleteComment(commentId)} className={`${styles.commentMenuItem} ${styles.deleteMenuItem}`}>Delete</button>
                                        </>
                                      ) : (
                                        <button 
                                          onClick={() => {
                                            console.log('🔘 Report button clicked!')
                                            handleReportComment(commentId)
                                          }} 
                                          className={`${styles.commentMenuItem} ${styles.reportMenuItem}`}
                                          style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            fontSize: '14px',
                                            color: '#1c1e21',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          Report
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Reply button with timestamp */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 12 }}>
                                <span className={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</span>
                                <span style={{ color: '#65676b' }}>•</span>
                                <button
                                  onClick={() => toggleReplyInput(commentId)}
                                  className={styles.commentReplyBtn}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                >
                                  Reply
                                </button>
                              </div>
                              
                              {/* Replies section - directly under the comment */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div style={{ marginTop: 8, marginLeft: 40, display: 'grid', gap: 8 }}>
                                  {comment.replies
                                    .filter(reply => {
                                      // Hide replies with valid report verdict from public
                                      if (reply.reportVerdict === 'VALID' && reply.userId !== user?.uid && reply.userEmail !== user?.email) {
                                        return false
                                      }
                                      return true
                                    })
                                    .map((reply, rIdx) => {
                                    const replyId = reply.id || `reply-${rIdx}`
                                    // Check if reply is hidden due to valid report
                                    const isHiddenReply = reply.reportVerdict === 'VALID' && (reply.userId === user?.uid || reply.userEmail === user?.email)
                                    return (
                                      <div 
                                        key={replyId} 
                                        className={styles.modalComment} 
                                        data-reply-id={replyId}
                                        style={isHiddenReply ? { opacity: 0.5 } : {}}
                                      >
                                        {/* Profile Picture */}
                                        <div className={styles.commentAvatar}>
                                          {reply.userProfilePicture ? (
                                            <img src={reply.userProfilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                          ) : (
                                            reply.userName ? reply.userName[0].toUpperCase() : 'U'
                                          )}
                                        </div>
                                        {/* Reply Content */}
                                        <div className={styles.commentContent}>
                                          {/* Bubble with menu button */}
                                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, position: 'relative' }}>
                                            <div className={styles.commentBubble}>
                                              <span className={styles.commentAuthor}>{reply.userName}</span>
                                              <p className={styles.commentText} dangerouslySetInnerHTML={{ __html: reply.text }}></p>
                                            </div>
                                            {/* Menu button right next to bubble */}
                                            <div style={{ position: 'relative' }}>
                                              <button 
                                                className={styles.commentMenuBtn}
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  e.stopPropagation()
                                                  console.log('🔘 Reply menu button clicked for:', replyId)
                                                  setShowCommentMenu(showCommentMenu === replyId ? null : replyId)
                                                }}
                                              >
                                                ⋯
                                              </button>
                                              {/* Dropdown menu - positioned relative to button */}
                                              {showCommentMenu === replyId && (
                                                <div 
                                                  className={styles.commentDropdown}
                                                  style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    right: 0,
                                                    marginTop: '4px'
                                                  }}
                                                >
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
                                          
                                          {/* Reply button with timestamp */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 12 }}>
                                            <span className={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</span>
                                            <span style={{ color: '#65676b' }}>•</span>
                                            <button
                                              onClick={() => toggleReplyInput(replyId)}
                                              className={styles.commentReplyBtn}
                                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {/* Reply input - appears after all replies */}
                              {showReplyInput[commentId] && (
                                <div style={{ marginTop: 8, marginLeft: 40 }}>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div className={styles.commentAvatar}>
                                      {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                      ) : (
                                        user?.firstName ? user.firstName[0].toUpperCase() : 'U'
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      placeholder={`Reply to ${comment.userName}...`}
                                      value={replyTextMap[commentId] || ''}
                                      onChange={(e) => setReplyTextMap(prev => ({ ...prev, [commentId]: e.target.value }))}
                                      onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddReply(commentId) } }}
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
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      user?.firstName ? user.firstName[0].toUpperCase() : 'U'
                    )}
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

      {/* Report Modal for Posts */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        targetUser={{
          id: reportedPost?.userId,
          displayName: reportedPost?.userName,
          firstName: reportedPost?.userName?.split(' ')[0],
          lastName: reportedPost?.userName?.split(' ')[1]
        }}
        content={{
          id: reportedPost?.id,
          caption: reportedPost?.text || reportedPost?.content,
          text: reportedPost?.text || reportedPost?.content,
          imageUrl: reportedPost?.imageUrl || reportedPost?.image,
          imageUrls: reportedPost?.imageUrls || reportedPost?.images || []
        }}
        contentType="post"
        reporterId={user?.uid}
      />

      {/* Report Modal for Comments */}
      <ReportModal
        visible={showCommentReportModal}
        onClose={closeCommentReportModal}
        targetUser={{
          id: reportedComment?.userId,
          displayName: reportedComment?.userName,
          firstName: reportedComment?.userName?.split(' ')[0],
          lastName: reportedComment?.userName?.split(' ')[1]
        }}
        content={{
          id: reportedComment?.id,
          caption: reportedComment?.text || reportedComment?.content,
          text: reportedComment?.text || reportedComment?.content,
          content: reportedComment?.text || reportedComment?.content
        }}
        contentType="comment"
        reporterId={user?.uid}
      />

      {/* Old Report Modal - Remove this entire block */}
      {false && showReportModal && reportedPost && (
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

      {/* Switching Role Loading Popup */}
      {showSwitchingRolePopup && (
        <div className={styles.switchingRoleOverlay}>
          <div className={styles.switchingRolePopup}>
            <h3 className={styles.switchingRoleTitle}>Switching Role</h3>
            
            <div className={styles.switchingRoleSteps}>
              {['Feed', 'Listings', 'Chats', 'Profile'].map((step, index) => (
                <div 
                  key={step} 
                  className={`${styles.switchingRoleStep} ${index <= switchingRoleStep ? styles.active : ''}`}
                >
                  <div className={styles.stepNumber}>
                    {index < switchingRoleStep ? '✓' : index === switchingRoleStep ? (
                      <div className={styles.stepSpinner}></div>
                    ) : (index + 1)}
                  </div>
                </div>
              ))}
            </div>
            
            <p className={styles.currentAction}>
              {switchingRoleStep === 0 && 'Loading Feed...'}
              {switchingRoleStep === 1 && 'Loading Listings...'}
              {switchingRoleStep === 2 && 'Loading Chats...'}
              {switchingRoleStep === 3 && 'Loading Profile...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Welcome Toast - Sliding from top-right */}
      {showLoginToast && (
        <div className={`${styles.toast} ${styles.show}`}>
          <i className={`fas fa-check-circle ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{loginToastMessage}</span>
          <button className={styles.toastClose} onClick={dismissLoginToast}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      </div>
  )
}
