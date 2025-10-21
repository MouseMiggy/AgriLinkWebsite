import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, query, orderBy, where, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
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

  const measurementUnits = ['kg', 'ton', 'sack', 'bag', 'liter', 'cubic meter', 'pieces', 'bundle']

  // Modal functions
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
    if (!formData.name.trim()) {
      alert('Please enter a product name')
      return
    }

    if (!formData.isFree && !formData.price.trim()) {
      alert('Please enter a price or mark as free')
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

      if (editingListing) {
        // Update existing listing
        await updateDoc(doc(db, 'livestock_listings', editingListing.id), listingData)
        alert('Listing updated successfully')
      } else {
        // Create new listing
        listingData.createdAt = serverTimestamp()
        await addDoc(collection(db, 'livestock_listings'), listingData)
        alert('Listing created successfully')
      }
      
      closeModal()
    } catch (error) {
      console.error('Error saving listing:', error)
      alert('Failed to save listing')
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
      const listingsData = []
      snapshot.forEach((doc) => {
        listingsData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setListings(listingsData)
      setFilteredListings(listingsData)
      setLoading(false)
    }, (error) => {
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
          
          {/* Add Listings Button for Livestock Owners */}
          {userRole === 'livestock_owner' && (
            <button 
              className={styles.addListingButton}
              onClick={openAddModal}
            >
              + Add Listings
            </button>
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
                      {userRole === 'livestock_owner' ? 
                        limitWords(listing.name || listing.title || listing.productName || 'Unnamed Listing', 50) :
                        listing.name || listing.title || listing.productName || 'Unnamed Listing'
                      }
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
                      <button 
                        className={styles.requestButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle request functionality here
                          alert('Request sent!')
                        }}
                      >
                        Request
                      </button>
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
                <button 
                  className={styles.requestButton}
                  onClick={() => {
                    alert('Request sent!')
                    closeDetailsModal()
                  }}
                >
                  Request
                </button>
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
    </div>
  )
}