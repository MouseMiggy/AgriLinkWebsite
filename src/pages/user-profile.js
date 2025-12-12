import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/user-profile.module.css'
import dashboardStyles from '../../styles/modules/dashboard.module.css'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { uploadImageToFirebaseStorage } from '../lib/firebaseStorage'

export default function UserProfile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [posts, setPosts] = useState([])
  const [requestCount, setRequestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editImagePreviews, setEditImagePreviews] = useState([])
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editLoading, setEditLoading] = useState(false)
  
  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editProfilePicture, setEditProfilePicture] = useState(null)
  const [editProfilePicturePreview, setEditProfilePicturePreview] = useState(null)
  const [editProfileLoading, setEditProfileLoading] = useState(false)
  const [editProfileLoadingMessage, setEditProfileLoadingMessage] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalType, setConfirmModalType] = useState('') // 'save' or 'discard'
  const [showHiddenPosts, setShowHiddenPosts] = useState(false) // For collapsible hidden posts container

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await loadUserProfile(currentUser.uid)
        await loadUserListings(currentUser.uid)
        await loadUserRequests(currentUser.uid)
        loadUserPosts(currentUser.uid)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest(`.${styles.postOptions}`)) {
        setShowDropdown(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  // Cleanup scroll lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  const loadUserProfile = async (userId) => {
    try {
      console.log('Loading user profile for userId:', userId)
      // Use 'Users' collection (capital U) - matching dashboard.js
      const userDoc = await getDoc(doc(db, 'Users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log('User profile loaded:', userData)
        setUserProfile(userData)
      } else {
        console.log('User document not found')
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadUserListings = async (userId) => {
    try {
      console.log('Loading listings for userId:', userId)
      const q = query(
        collection(db, 'livestock_listings'),
        where('ownerId', '==', userId)
      )
      const snapshot = await getDocs(q)
      console.log('Total listings found:', snapshot.docs.length)
      
      const allListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filter out sold and deleted listings - only count available ones
      const availableListings = allListings.filter(
        listing => listing.status !== 'sold' && listing.status !== 'deleted'
      )
      
      console.log('Available listings (not sold/deleted):', availableListings.length)
      
      // Sort manually by createdAt
      availableListings.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
      setListings(availableListings)
    } catch (error) {
      console.error('Error loading listings:', error)
    }
  }

  const loadUserRequests = async (userId) => {
    try {
      console.log('Loading requests for userId:', userId)
      const q = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', userId)
      )
      const snapshot = await getDocs(q)
      const count = snapshot.size
      console.log('Total requests made:', count)
      setRequestCount(count)
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const loadUserPosts = (userId) => {
    console.log('Loading posts for userId:', userId)
    // Use real-time listener for posts
    const unsubscribe = onSnapshot(collection(db, 'Posts'), (snapshot) => {
      const userPosts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(post => post.userId === userId)
      
      console.log('User posts found:', userPosts.length)
      
      // Sort manually by createdAt desc
      userPosts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0))
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0))
        return dateB - dateA
      })
      
      setPosts(userPosts)
    })
    return unsubscribe
  }

  // Toggle dropdown menu
  const toggleDropdown = (postId) => {
    setShowDropdown(showDropdown === postId ? null : postId)
  }

  // Check if user has liked a post
  const hasUserLiked = (post) => {
    return post.likedBy?.includes(user?.uid)
  }

  // Handle like/unlike post
  const handleLikePost = async (post) => {
    if (!user) return
    
    try {
      const postRef = doc(db, 'Posts', post.id)
      const hasLiked = hasUserLiked(post)
      
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: (post.likes || 1) - 1,
          likedBy: arrayRemove(user.uid)
        })
      } else {
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1,
          likedBy: arrayUnion(user.uid)
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  // Handle edit post
  const handleEditPost = (post) => {
    setEditingPost(post)
    setEditText(post.text || '')
    
    // Initialize existing images
    const existingImages = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
    setEditImagePreviews(existingImages)
    setEditImageFiles([])
    
    setShowEditModal(true)
    setShowDropdown(null)
  }

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingPost(null)
    setEditText('')
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditLoading(false)
  }

  // Handle image selection for edit
  const handleEditImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const newPreviews = files.map(file => URL.createObjectURL(file))
    
    setEditImageFiles(prev => [...prev, ...files])
    setEditImagePreviews(prev => [...prev, ...newPreviews])
  }

  // Remove image from edit
  const removeEditImage = (index) => {
    const preview = editImagePreviews[index]
    const existingImages = editingPost?.imageUrls || (editingPost?.imageUrl ? [editingPost.imageUrl] : [])
    
    // Check if it's an existing image or a new upload
    if (existingImages.includes(preview)) {
      // It's an existing image, just remove from previews
      setEditImagePreviews(prev => prev.filter((_, i) => i !== index))
    } else {
      // It's a new upload, remove from both files and previews
      const newFileIndex = editImagePreviews.slice(existingImages.length).indexOf(preview)
      if (newFileIndex !== -1) {
        setEditImageFiles(prev => prev.filter((_, i) => i !== newFileIndex))
      }
      setEditImagePreviews(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Save edited post
  const saveEditedPost = async () => {
    if ((!editText.trim() && editImagePreviews.length === 0) || !editingPost) {
      console.log('Validation failed:', { editText, editImagePreviews, editingPost })
      return
    }
    
    setEditLoading(true)
    console.log('Starting save edit for post:', editingPost.id)

    try {
      // Upload new images to Cloudinary
      const newImageUrls = []
      if (editImageFiles.length > 0) {
        console.log('Uploading', editImageFiles.length, 'new images...')
        for (const file of editImageFiles) {
          try {
            const imageUrl = await uploadImageToFirebaseStorage(file, 'Images/Feed', user.uid)
            if (imageUrl) {
              newImageUrls.push(imageUrl)
              console.log('Image uploaded:', imageUrl)
            }
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError)
          }
        }
      }

      // Combine existing images with new uploaded images
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
      
      console.log('Final image URLs:', finalImageUrls)

      const postRef = doc(db, 'Posts', editingPost.id)
      const updateData = {
        text: editText.trim()
      }

      // Only add editedAt if we have serverTimestamp
      try {
        updateData.editedAt = serverTimestamp()
      } catch (e) {
        updateData.editedAt = new Date()
      }

      // Update image fields
      if (finalImageUrls.length > 0) {
        updateData.imageUrls = finalImageUrls
        updateData.imageUrl = finalImageUrls[0]
      } else {
        updateData.imageUrls = []
        updateData.imageUrl = null
      }

      console.log('Update data:', updateData)
      await updateDoc(postRef, updateData)
      console.log('Post updated successfully!')
      
      closeEditModal()
    } catch (error) {
      console.error('Error editing post:', error)
      console.error('Error details:', error.message, error.code)
      alert('Failed to update post: ' + error.message)
      setEditLoading(false)
    }
  }

  // Handle delete post
  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      await deleteDoc(doc(db, 'Posts', postId))
      setShowDropdown(null)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  // Open Edit Profile Modal
  const openEditProfileModal = () => {
    setEditFirstName(userProfile?.firstName || '')
    setEditLastName(userProfile?.lastName || '')
    setEditProfilePicturePreview(userProfile?.profilePicture || user?.photoURL || null)
    setEditProfilePicture(null)
    setShowEditProfileModal(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  // Check if there are unsaved changes
  const hasProfileChanges = () => {
    const originalFirstName = userProfile?.firstName || ''
    const originalLastName = userProfile?.lastName || ''
    const originalPicture = userProfile?.profilePicture || user?.photoURL || null
    
    return (
      editFirstName !== originalFirstName ||
      editLastName !== originalLastName ||
      editProfilePicture !== null
    )
  }

  // Close Edit Profile Modal
  const closeEditProfileModal = () => {
    setShowEditProfileModal(false)
    setEditFirstName('')
    setEditLastName('')
    setEditProfilePicture(null)
    setEditProfilePicturePreview(null)
    setEditProfileLoadingMessage('')
    // Restore background scrolling
    document.body.style.overflow = 'auto'
  }

  // Handle Cancel with confirmation
  const handleCancelEditProfile = () => {
    if (hasProfileChanges()) {
      setConfirmModalType('discard')
      setShowConfirmModal(true)
    } else {
      closeEditProfileModal()
    }
  }

  // Confirm discard changes
  const confirmDiscardChanges = async () => {
    setShowConfirmModal(false)
    setEditProfileLoading(true)
    setEditProfileLoadingMessage('Discarding changes...')
    await new Promise(resolve => setTimeout(resolve, 800))
    setEditProfileLoading(false)
    setEditProfileLoadingMessage('')
    closeEditProfileModal()
  }

  // Handle Profile Picture Selection
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditProfilePicture(file)
      setEditProfilePicturePreview(URL.createObjectURL(file))
    }
  }

  // Request save confirmation
  const requestSaveChanges = () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      alert('Please enter both first name and last name')
      return
    }
    setConfirmModalType('save')
    setShowConfirmModal(true)
  }

  // Save Profile Changes
  const saveProfileChanges = async () => {
    setShowConfirmModal(false)
    setEditProfileLoading(true)
    setEditProfileLoadingMessage('Saving changes...')

    try {
      let profilePictureUrl = userProfile?.profilePicture || null

      // Upload new profile picture if selected
      if (editProfilePicture) {
        console.log('Uploading new profile picture...')
        profilePictureUrl = await uploadImageToFirebaseStorage(editProfilePicture, 'Images/Profile', user.uid)
        console.log('Profile picture uploaded:', profilePictureUrl)
      }

      // Update user document in Firebase (use setDoc with merge to create if doesn't exist)
      const userRef = doc(db, 'Users', user.uid)
      const updateData = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      }

      if (profilePictureUrl) {
        updateData.profilePicture = profilePictureUrl
      }

      await setDoc(userRef, updateData, { merge: true })
      console.log('Profile updated successfully')

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        profilePicture: profilePictureUrl
      }))

      // Show done message briefly
      setEditProfileLoadingMessage('Done!')
      await new Promise(resolve => setTimeout(resolve, 500))

      closeEditProfileModal()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile: ' + error.message)
    } finally {
      setEditProfileLoading(false)
      setEditProfileLoadingMessage('')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const seconds = Math.floor((new Date() - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return formatDate(timestamp)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Cover Photo */}
      <div className={styles.coverPhoto}>
        <div className={styles.coverGradient}></div>
      </div>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileHeaderContent}>
          {/* Profile Picture */}
          <div className={styles.profilePictureWrapper}>
            <div className={styles.profilePicture}>
              {userProfile?.profilePicture || user?.photoURL ? (
                <img src={userProfile?.profilePicture || user?.photoURL} alt="Profile" className={styles.profileImage} />
              ) : (
                <div className={styles.profileInitial}>
                  {userProfile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className={styles.userInfo}>
            <h1 className={styles.userName}>
              {userProfile?.firstName && userProfile?.lastName
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : user?.displayName || user?.email || 'User'}
            </h1>
            <p className={styles.userRole}>
              {userProfile?.role === 'livestock_owner' ? 'Livestock Owner' : 
               userProfile?.role === 'crop_farmer' ? 'Crop Farmer' : 'User'}
            </p>
            <div className={styles.userRating}>
              <span className={styles.ratingStars}>
                {'★'.repeat(Math.floor(userProfile?.averageRating || 0))}
                {'☆'.repeat(5 - Math.floor(userProfile?.averageRating || 0))}
              </span>
              <span className={styles.ratingValue}>
                {typeof userProfile?.averageRating === 'number' ? userProfile.averageRating.toFixed(1) : '0.0'}
              </span>
              <span className={styles.ratingCount}>
                ({userProfile?.totalRatings || 0} rating{(userProfile?.totalRatings || 0) !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button className={styles.editProfileButton} onClick={openEditProfileModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <aside className={styles.leftSidebar}>
          {/* Intro Card */}
          <div className={styles.introCard}>
            <h2 className={styles.cardTitle}>Intro</h2>
            <div className={styles.introContent}>
              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Email</p>
                  <p className={styles.introValue}>{user?.email || 'Not provided'}</p>
                </div>
              </div>

              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Phone Number</p>
                  <p className={styles.introValue}>{userProfile?.phoneNumber || 'Not provided'}</p>
                </div>
              </div>

              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Joined</p>
                  <p className={styles.introValue}>
                    {userProfile?.createdAt 
                      ? (userProfile.createdAt.toDate 
                          ? userProfile.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
                      : 'Recently joined'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className={styles.statsCard}>
            <h2 className={styles.cardTitle}>Activity</h2>
            <div className={styles.statsContent}>
              {userProfile?.role === 'livestock_owner' ? (
                <>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{listings.length}</p>
                    <p className={styles.statLabel}>Listings</p>
                  </div>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{posts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{requestCount}</p>
                    <p className={styles.statLabel}>Requests</p>
                  </div>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{posts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <main className={styles.rightContent}>
          {/* Posts Title */}
          <h2 className={styles.postsTitle}>Posts</h2>

          {/* Posts Display */}
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <h3>No posts yet</h3>
              <p>When you create posts, they will appear here</p>
            </div>
          ) : (
            <>
              {/* Hidden Posts Container - Collapsible */}
              {posts.filter(post => post.reportVerdict === 'VALID').length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div 
                    onClick={() => setShowHiddenPosts(!showHiddenPosts)}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: showHiddenPosts ? '0.5rem' : '0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                      <span style={{ fontWeight: '600', color: '#856404' }}>
                        Hidden Posts ({posts.filter(post => post.reportVerdict === 'VALID').length})
                      </span>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#856404' }}>
                      {showHiddenPosts ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {showHiddenPosts && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#fff9e6',
                      border: '1px solid #ffc107',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px'
                    }}>
                      <p style={{ 
                        fontSize: '0.9rem', 
                        color: '#856404', 
                        marginBottom: '1rem',
                        fontStyle: 'italic'
                      }}>
                        These posts were hidden due to reports. They are only visible to you.
                      </p>
                      {posts.filter(post => post.reportVerdict === 'VALID').map((post) => (
                        <div key={post.id} style={{ opacity: 0.5, marginBottom: '1rem' }}>
                          <div className={styles.post}>
                            <div className={styles.postHeader}>
                              <div className={styles.postAvatar}>
                                {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className={styles.postInfo}>
                                <h4 className={styles.postAuthor}>
                                  {userProfile?.firstName && userProfile?.lastName
                                    ? `${userProfile.firstName} ${userProfile.lastName}`
                                    : user?.displayName || 'User'}
                                </h4>
                                <span className={styles.postTime}>
                                  {formatTimeAgo(post.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className={styles.postContent}>
                              {post.text && <p className={styles.postText}>{post.text}</p>}
                              {(post.imageUrls?.length > 0 || post.images?.length > 0 || post.imageUrl) && (
                                <div className={styles.postImages}>
                                  {(post.imageUrls || post.images || (post.imageUrl ? [post.imageUrl] : [])).map((image, index) => (
                                    <img key={index} src={image} alt={`Post image ${index + 1}`} className={styles.postImage} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Regular Posts */}
              <div className={styles.postsListView}>
              {posts.filter(post => post.reportVerdict !== 'VALID').map((post) => (
                  <div key={post.id} className={styles.post}>
                    <div className={styles.postHeader}>
                      <div className={styles.postAvatar}>
                        {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className={styles.postInfo}>
                        <h4 className={styles.postAuthor}>
                          {userProfile?.firstName && userProfile?.lastName
                            ? `${userProfile.firstName} ${userProfile.lastName}`
                            : user?.displayName || 'User'}
                        </h4>
                        <span className={styles.postTime}>
                          {formatTimeAgo(post.createdAt)}
                          {post.editedAt && <span className={styles.edited}> (edited)</span>}
                        </span>
                      </div>
                      {/* 3-dot menu */}
                      <div className={styles.postOptions}>
                        <button 
                          className={styles.optionsBtn}
                          onClick={() => toggleDropdown(post.id)}
                        >
                          <img src="/assets/icons/menu-dots.png" alt="Options" className={styles.optionsIcon} />
                        </button>
                        {showDropdown === post.id && (
                          <div className={styles.dropdown}>
                            <button onClick={() => handleEditPost(post)} className={styles.dropdownItem}>
                              <img src="/assets/icons/pencil.png" alt="Edit" className={styles.dropdownIcon} />
                              Edit Post
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className={`${styles.dropdownItem} ${styles.deleteItem}`}>
                              <img src="/assets/icons/delete-white.png" alt="Delete" className={styles.dropdownIcon} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.postContent}>
                      {post.text && (
                        <p className={styles.postText}>{post.text}</p>
                      )}

                      {/* Support imageUrls array, images array, or single imageUrl */}
                      {(post.imageUrls?.length > 0 || post.images?.length > 0 || post.imageUrl) && (
                        <div className={styles.postImages}>
                          {(post.imageUrls || post.images || (post.imageUrl ? [post.imageUrl] : [])).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Post image ${index + 1}`}
                              className={styles.postImage}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post Stats */}
                    <div className={styles.postStats}>
                      <span>{post.likes || 0} likes</span>
                      <span>{post.comments?.length || 0} comments</span>
                    </div>

                    <div className={styles.postSeparator}></div>

                    {/* Post Actions */}
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
                      <button className={styles.actionBtn}>
                        <img src="/assets/icons/comment-all-dots.png" alt="Comment" className={styles.actionIcon} />
                        Comment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Post Modal - Using dashboard styles for consistency */}
      {showEditModal && editingPost && (
        <div className={dashboardStyles.modalOverlay} onClick={closeEditModal}>
          <div className={dashboardStyles.postModal} onClick={(e) => e.stopPropagation()}>
            <div className={dashboardStyles.modalHeader}>
              <h3>Edit Post</h3>
              <button onClick={closeEditModal} className={dashboardStyles.closeModalBtn}>×</button>
            </div>
            
            <div className={dashboardStyles.modalContent}>
              <div className={dashboardStyles.modalUserInfo}>
                <div className={dashboardStyles.modalUserAvatar}>
                  {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className={dashboardStyles.modalUserName}>
                  {userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : user?.displayName || 'User'}
                </span>
              </div>
              
              <div className={dashboardStyles.modalBody}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="What's on your mind?"
                  className={dashboardStyles.modalTextarea}
                  rows={4}
                  autoFocus
                />
              </div>
              
              <div className={dashboardStyles.modalFooter}>
                <div className={dashboardStyles.modalActions}>
                  {editImagePreviews.length > 0 ? (
                    <div className={dashboardStyles.multipleImagePreview}>
                      {editImagePreviews.map((preview, index) => (
                        <div key={index} className={dashboardStyles.previewImageContainer}>
                          <img src={preview} alt={`Preview ${index + 1}`} className={dashboardStyles.buttonPreviewImage} />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeEditImage(index)
                            }}
                            className={dashboardStyles.removeImageBtn}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      <label className={dashboardStyles.addMoreImagesBtn}>
                        <img src="/assets/icons/image.png" alt="Photo" className={dashboardStyles.modalActionIcon} />
                        Add More
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className={dashboardStyles.hiddenInput}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className={dashboardStyles.modalImageUpload}>
                      <img src="/assets/icons/image.png" alt="Photo" className={dashboardStyles.modalActionIcon} />
                      Add Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageSelect}
                        className={dashboardStyles.hiddenInput}
                      />
                    </label>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeEditModal}
                    className={dashboardStyles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedPost}
                    disabled={editLoading || (!editText.trim() && editImagePreviews.length === 0)}
                    className={dashboardStyles.modalPostButton}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className={styles.modalOverlay} onClick={closeEditProfileModal}>
          <div className={styles.editProfileModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editProfileHeader}>
              <h2>Edit Profile</h2>
              <button className={styles.closeModalBtn} onClick={closeEditProfileModal}>×</button>
            </div>
            
            <div className={styles.editProfileContent}>
              {/* Profile Picture Section */}
              <div className={styles.editProfilePictureSection}>
                <div className={styles.editProfilePicturePreview}>
                  {editProfilePicturePreview ? (
                    <img src={editProfilePicturePreview} alt="Profile Preview" />
                  ) : (
                    <div className={styles.editProfileInitial}>
                      {editFirstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <label className={styles.changePhotoBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/>
                  </svg>
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Name Fields */}
              <div className={styles.editProfileFields}>
                <div className={styles.editProfileField}>
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className={styles.editProfileField}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Action Buttons or Loading State */}
              {editProfileLoading ? (
                <div className={styles.editProfileLoadingState}>
                  <div className={styles.editProfileSpinner}></div>
                  <p>{editProfileLoadingMessage}</p>
                </div>
              ) : (
                <div className={styles.editProfileActions}>
                  <button className={styles.cancelProfileBtn} onClick={handleCancelEditProfile}>
                    Cancel
                  </button>
                  <button 
                    className={styles.saveProfileBtn} 
                    onClick={requestSaveChanges}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.confirmModalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmModalIcon}>
              {confirmModalType === 'save' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#fa9100"/>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#fa9100"/>
                </svg>
              )}
            </div>
            <h3 className={styles.confirmModalTitle}>
              {confirmModalType === 'save' ? 'Save Changes?' : 'Discard Changes?'}
            </h3>
            <p className={styles.confirmModalText}>
              {confirmModalType === 'save' 
                ? 'Are you sure you want to save your profile changes?' 
                : 'Are you sure you want to discard all changes?'}
            </p>
            <div className={styles.confirmModalActions}>
              <button 
                className={styles.confirmModalCancelBtn}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmModalConfirmBtn}
                onClick={confirmModalType === 'save' ? saveProfileChanges : confirmDiscardChanges}
              >
                {confirmModalType === 'save' ? 'Save' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
