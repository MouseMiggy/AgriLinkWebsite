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
  deleteDoc,
  where,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore'
import { uploadImageToCloudinary } from '../lib/cloudinary'
import styles from '../styles/listings.module.css'

export default function Listings() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredListings, setFilteredListings] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [requestingListings, setRequestingListings] = useState(new Set())
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    measurements: '',
    measurementUnit: 'kg',
    price: '',
    isFree: false,
    image: null
  })

  const router = useRouter()
  const measurementUnits = ['kg', 'ton', 'sack', 'bag', 'liter', 'cubic meter', 'pieces', 'bundle']

  // Listen for auth state changes
  useEffect(() => {
    if (!auth || !db) return

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
              uid: currentUser.uid,
              displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || currentUser.displayName
            })
            setUserRole(userData.role || null)
          } else {
            setUser({
              firstName: currentUser.displayName?.split(' ')[0] || 'User',
              lastName: currentUser.displayName?.split(' ')[1] || '',
              email: currentUser.email,
              uid: currentUser.uid,
              displayName: currentUser.displayName
            })
          }
        } catch (error) {
          console.error('Error loading user data:', error)
          setUser({
            firstName: currentUser.displayName?.split(' ')[0] || 'User',
            lastName: currentUser.displayName?.split(' ')[1] || '',
            email: currentUser.email,
            uid: currentUser.uid,
            displayName: currentUser.displayName
          })
        }
      } else {
        router.push('/signin')
      }
    })

    return () => unsubscribeAuth()
  }, [])

  // Load listings based on user role
  useEffect(() => {
    if (!user || !userRole || !db) return

    setLoading(true)
    let q

    console.log('Loading listings for user:', user.uid, 'role:', userRole)
    
    if (userRole === 'livestock_owner') {
      // Livestock owners see only their own listings
      console.log('Querying livestock_listings where ownerId ==', user.uid)
      // Try without orderBy first to see if there are any documents
      q = query(
        collection(db, 'livestock_listings'),
        where('ownerId', '==', user.uid)
      )
    } else if (userRole === 'crop_farmer') {
      // Crop farmers see all listings
      console.log('Querying all livestock_listings')
      q = query(
        collection(db, 'livestock_listings')
      )
    }

    if (q) {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const listingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        console.log('Loaded listings for', userRole, ':', listingsData.length, 'items')
        console.log('User UID:', user.uid)
        if (listingsData.length > 0) {
          console.log('Sample listing:', listingsData[0])
          console.log('Listing ownerIds:', listingsData.map(l => l.ownerId))
        }
        console.log('Listings data:', listingsData)
        setListings(listingsData)
        setLoading(false)
      }, (error) => {
        console.error('Error loading listings:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    }
  }, [user, userRole])

  // Load requested listings from localStorage on component mount
  useEffect(() => {
    if (user && userRole === 'crop_farmer') {
      const savedRequested = localStorage.getItem(`requestedListings_${user.uid}`)
      if (savedRequested) {
        try {
          const requestedArray = JSON.parse(savedRequested)
          setRequestedListings(new Set(requestedArray))
        } catch (error) {
          console.error('Error loading requested listings:', error)
        }
      }
    }
  }, [user, userRole])

  // Save requested listings to localStorage whenever it changes
  useEffect(() => {
    if (user && userRole === 'crop_farmer' && requestedListings.size > 0) {
      const requestedArray = Array.from(requestedListings)
      localStorage.setItem(`requestedListings_${user.uid}`, JSON.stringify(requestedArray))
    }
  }, [requestedListings, user, userRole])

  // Filter listings based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredListings(listings)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = listings.filter(listing => 
      listing.name?.toLowerCase().includes(query) ||
      listing.details?.toLowerCase().includes(query) ||
      listing.ownerName?.toLowerCase().includes(query) ||
      listing.measurementUnit?.toLowerCase().includes(query)
    )
    
    setFilteredListings(filtered)
  }, [listings, searchQuery])

  const openAddModal = () => {
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null
    })
    setEditingListing(null)
    setImageFile(null)
    setImagePreview(null)
    setShowAddModal(true)
  }

  const openEditModal = (listing) => {
    setFormData({
      name: listing.name || '',
      details: listing.details || '',
      measurements: listing.measurements || '',
      measurementUnit: listing.measurementUnit || 'kg',
      price: listing.price === 'Free' ? '' : listing.price || '',
      isFree: listing.isFree || listing.price === 'Free',
      image: listing.image || null
    })
    setEditingListing(listing)
    setImageFile(null)
    setImagePreview(listing.image || null)
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
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData({...formData, image: null})
  }

  const saveListing = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a product name')
      return
    }

    if (!formData.isFree && !formData.price.trim()) {
      alert('Please enter a price or mark as free')
      return
    }

    // Prevent multiple submissions
    if (saveLoading || uploadingImage) return

    try {
      setSaveLoading(true)
      setUploadingImage(false) // Reset uploading state
      
      let imageUrl = formData.image
      
      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true)
        console.log('Starting image upload...')
        imageUrl = await uploadImageToCloudinary(imageFile)
        console.log('Image upload completed:', imageUrl)
        setUploadingImage(false)
      }

      console.log('Saving listing to Firestore...')
      const listingData = {
        name: formData.name.trim(),
        details: formData.details.trim(),
        measurements: formData.measurements.trim(),
        measurementUnit: formData.measurementUnit,
        price: formData.isFree ? 'Free' : formData.price.trim(),
        isFree: formData.isFree,
        image: imageUrl,
        ownerId: user.uid,
        ownerName: (user.firstName + ' ' + user.lastName).trim(),
        ownerEmail: user.email,
        updatedAt: serverTimestamp()
      }

      if (editingListing) {
        await updateDoc(doc(db, 'livestock_listings', editingListing.id), listingData)
        console.log('Listing updated successfully')
        alert('Listing updated successfully')
      } else {
        listingData.createdAt = serverTimestamp()
        await addDoc(collection(db, 'livestock_listings'), listingData)
        console.log('Listing created successfully')
        alert('Listing created successfully')
      }

      closeModal()
    } catch (error) {
      console.error('Error saving listing:', error)
      alert('Failed to save listing: ' + error.message)
    } finally {
      setSaveLoading(false)
      setUploadingImage(false)
    }
  }

  const deleteListing = async (listingId) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteDoc(doc(db, 'livestock_listings', listingId))
      } catch (error) {
        console.error('Error deleting listing:', error)
        alert('Failed to delete listing')
      }
    }
  }

  const requestListing = async (listing) => {
    if (requestingListings.has(listing.id)) return

    setRequestingListings(prev => new Set([...prev, listing.id]))

    try {
      // Create a chat between crop farmer and livestock owner
      const chatId = [user.uid, listing.ownerId].sort().join('_')
      
      // First, create/update the chat document to ensure both users can see it
      const senderName = `${user.firstName} ${user.lastName}`.trim() || user.displayName || user.email || 'Crop Farmer'
      
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, listing.ownerId],
        participantNames: {
          [user.uid]: senderName,
          [listing.ownerId]: listing.ownerName || listing.ownerEmail || 'Livestock Owner'
        },
        participantEmails: {
          [user.uid]: user.email || '',
          [listing.ownerId]: listing.ownerEmail || ''
        },
        lastMessage: "Hello, is this still available?",
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Send initial message
      const messageData = {
        text: "Hello, is this still available?",
        senderId: user.uid,
        senderName: senderName,
        receiverId: listing.ownerId,
        createdAt: serverTimestamp(),
        read: false,
        listingId: listing.id,
        listingTitle: listing.name,
        isListingRequest: true
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
      
      // Mark listing as requested
      setRequestedListings(prev => new Set([...prev, listing.id]))
      
      alert(`Request sent! Your message has been sent to ${listing.ownerName || listing.ownerEmail || 'the owner'}.`)
      
    } catch (error) {
      console.error('Error requesting listing:', error)
      alert('Failed to send request')
    } finally {
      setRequestingListings(prev => {
        const newSet = new Set(prev)
        newSet.delete(listing.id)
        return newSet
      })
    }
  }

  const isUserListing = (listing) => {
    return user && listing.ownerId === user.uid
  }

  if (!user || !userRole) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f8f9fa', width: '100vw', boxSizing: 'border-box' }}>
      {/* Header and Search in One Container - Full Width */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: '600', 
            color: '#1c1e21' 
          }}>
            {userRole === 'livestock_owner' ? 'My Listings' : 'Available Listings'}
          </h1>
          
          {userRole === 'livestock_owner' && (
            <button 
              onClick={openAddModal}
              style={{
                backgroundColor: '#fa9100',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              + Add Listing
            </button>
          )}
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search listings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #e4e6ea',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Listings Grid - 3 Columns - Full Width */}
      <div style={{ width: '100%' }}>
        {filteredListings.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1c1e21' }}>No Listings Available</h3>
            <p style={{ margin: 0, color: '#65676b' }}>
              {userRole === 'livestock_owner' 
                ? "You haven't created any listings yet. Click 'Add Listing' to get started!"
                : "No livestock listings are available at the moment. Check back later!"
              }
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '60px'
          }}>
          {filteredListings.map((listing) => (
            <div key={listing.id} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Image */}
              <div style={{ height: '250px', overflow: 'hidden', position: 'relative' }}>
                {listing.image ? (
                  <img 
                    src={listing.image} 
                    alt={listing.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => setPreviewImage(listing.image)}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6c757d'
                  }}>
                    <span style={{ fontSize: '48px', marginBottom: '8px' }}>📷</span>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No Image</p>
                  </div>
                )}
                
                {/* Price Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: listing.isFree ? '#28a745' : '#fa9100',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}>
                  {listing.isFree ? 'Free' : `₱${listing.price}`}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '32px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1c1e21',
                  lineHeight: '1.3'
                }}>
                  {listing.name}
                </h3>

                <p style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '13px', 
                  color: '#65676b',
                  fontWeight: '500'
                }}>
                  by {listing.ownerName}
                </p>

                {listing.details && (
                  <p style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '14px', 
                    color: '#1c1e21', 
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {listing.details}
                  </p>
                )}

                {listing.measurements && (
                  <div style={{
                    background: '#f8f9fa',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#495057',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    📦 {listing.measurements} {listing.measurementUnit}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {userRole === 'livestock_owner' && isUserListing(listing) ? (
                    <>
                      <button 
                        onClick={() => openEditModal(listing)}
                        style={{
                          background: '#1877f2',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteListing(listing.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </>
                  ) : userRole === 'crop_farmer' && !isUserListing(listing) ? (
                    <button 
                      onClick={() => requestListing(listing)}
                      disabled={requestingListings.has(listing.id) || requestedListings.has(listing.id)}
                      style={{
                        background: requestedListings.has(listing.id) ? '#28a745' : '#fa9100',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: requestingListings.has(listing.id) || requestedListings.has(listing.id) ? 'not-allowed' : 'pointer',
                        opacity: requestingListings.has(listing.id) || requestedListings.has(listing.id) ? 0.7 : 1,
                        width: '100%'
                      }}
                    >
                      {requestingListings.has(listing.id) ? 'Sending...' : 
                       requestedListings.has(listing.id) ? '✓ Requested' : 'Request'}
                    </button>
                  ) : userRole === 'crop_farmer' && isUserListing(listing) ? (
                    <span style={{
                      color: '#6c757d',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      padding: '8px 0',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      Your Listing
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingListing ? 'Edit Listing' : 'New Listing'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Cattle Manure, Compost"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Details</label>
                <textarea
                  placeholder="Product details, nutrient content, condition, etc."
                  value={formData.details}
                  onChange={(e) => setFormData({...formData, details: e.target.value})}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.measurements}
                    onChange={(e) => setFormData({...formData, measurements: e.target.value})}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Unit</label>
                  <select
                    value={formData.measurementUnit}
                    onChange={(e) => setFormData({...formData, measurementUnit: e.target.value})}
                    className={styles.select}
                  >
                    {measurementUnits.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Pricing</label>
                <div className={styles.pricingContainer}>
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
                      placeholder="Price (₱)"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className={styles.input}
                    />
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Image (Optional)</label>
                {imagePreview ? (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      className={styles.removeImageButton}
                      onClick={removeImage}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className={styles.imageUpload}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={styles.fileInput}
                      id="imageUpload"
                    />
                    <label htmlFor="imageUpload" className={styles.uploadLabel}>
                      📷 Choose Image
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton} 
                onClick={closeModal}
                disabled={false}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton} 
                onClick={saveListing}
                disabled={saveLoading || uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : saveLoading ? 'Saving...' : editingListing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className={styles.imagePreviewModal} onClick={() => setPreviewImage(null)}>
          <div className={styles.imagePreviewContainer}>
            <button 
              className={styles.closePreviewButton}
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>
            <img src={previewImage} alt="Preview" className={styles.fullImage} />
          </div>
        </div>
      )}
    </div>
  )
}
