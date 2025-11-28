import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import styles from '../../styles/modules/listing-history.module.css'

export default function ListingHistory() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)

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

  // Fetch user's sold and deleted listings (for livestock owners)
  useEffect(() => {
    if (!user || !db || userRole !== 'livestock_owner') return

    // Try without orderBy first to fix deleted listings not showing
    const q = query(
      collection(db, 'livestock_listings'),
      where('ownerId', '==', user.uid),
      where('status', 'in', ['sold', 'deleted'])
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        // Include sold and deleted listings
        listingsData.push({
          id: doc.id,
          ...data
        })
      })
      // Sort manually by createdAt (newest first)
      listingsData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      setListings(listingsData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching listings:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, userRole])

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    
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
      return 'Invalid date'
    }
  }

  const formatPrice = (price, isFree) => {
    if (isFree || price === 'Free') return 'Free'
    if (!price) return '-'
    return `₱${parseFloat(price).toLocaleString()}`
  }

  const truncateText = (text, maxLength) => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getStatusBadge = (status) => {
    const statusClass = status === 'sold' ? styles.statusSold : styles.statusDeleted
    const statusText = status === 'sold' ? 'Sold' : 'Deleted'
    return (
      <div className={`${styles.statusBadge} ${statusClass}`}>
        {statusText}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Listing History</h1>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Listing History</h1>
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <p style={{ fontSize: '16px', color: '#65676b', fontFamily: 'Poppins, sans-serif' }}>
            No listing sold or deleted yet
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.headerListingName}>Listing Name</div>
            <div className={styles.headerDetails}>Details</div>
            <div className={styles.headerPrice}>Price</div>
            <div className={styles.headerQuantity}>Quantity</div>
            <div className={styles.headerStatus}>Status</div>
            <div className={styles.headerDateAdded}>Date Added</div>
            <div className={styles.headerDateSold}>Date Sold/Deleted</div>
          </div>
          
          <div className={styles.listingsList}>
            {listings.map((listing, index) => (
              <div 
                key={listing.id} 
                className={`${styles.listingCard} ${index === listings.length - 1 ? styles.lastItem : ''}`}
              >
                <div className={styles.listingName} title={listing.name || 'Unnamed Listing'}>
                  {truncateText(listing.name || 'Unnamed Listing', 25)}
                </div>
                
                <div className={styles.details} title={listing.details || 'No details'}>
                  {truncateText(listing.details || 'No details', 40)}
                </div>
                
                <div className={styles.price}>
                  {formatPrice(listing.price, listing.isFree)}
                </div>
                
                <div className={styles.quantity}>
                  {listing.measurements ? `${listing.measurements} ${listing.measurementUnit || ''}` : '-'}
                </div>
                
                <div className={styles.status}>
                  {getStatusBadge(listing.status)}
                </div>
                
                <div className={styles.dateAdded}>
                  {formatDate(listing.createdAt)}
                </div>
                
                <div className={styles.dateSold}>
                  {formatDate(listing.status === 'sold' ? listing.soldAt : listing.deletedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
