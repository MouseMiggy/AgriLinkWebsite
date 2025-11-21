import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
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

  // Fetch user's listings from the past week (for livestock owners)
  useEffect(() => {
    if (!user || !db || userRole !== 'livestock_owner') return

    // Calculate date 1 week ago
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoTimestamp = Timestamp.fromDate(oneWeekAgo)

    const q = query(
      collection(db, 'livestock_listings'),
      where('ownerId', '==', user.uid),
      where('createdAt', '>=', oneWeekAgoTimestamp),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        // Include all listings (active, sold, and deleted)
        listingsData.push({
          id: doc.id,
          ...data
        })
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
      return 'Invalid date'
    }
  }

  const formatPrice = (price, isFree) => {
    if (isFree || price === 'Free') return 'Free'
    if (!price) return 'Price not set'
    return `₱${price}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your listings...</div>
      </div>
    )
  }

  if (userRole !== 'livestock_owner') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>This page is only available for livestock owners.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Listing History</h1>
        <p className={styles.subtitle}>Your livestock listings from the past week</p>
      </div>

      {listings.length === 0 ? (
        <div className={styles.emptyState}>
          <img src="/assets/icons/listing.png" alt="No listings" className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No Recent Listings</h3>
          <p className={styles.emptyText}>
            You haven't posted any livestock listings in the past week. Create a new listing to start selling your livestock.
          </p>
        </div>
      ) : (
        <div className={styles.listingsList}>
          {listings.map((listing) => (
            <div key={listing.id} className={styles.listingCard}>
              <div className={styles.listingHeader}>
                <div className={styles.listingInfo}>
                  <h3 className={styles.listingName}>{listing.name || listing.title || 'Unnamed Listing'}</h3>
                  <p className={styles.listingPrice}>{formatPrice(listing.price, listing.isFree)}</p>
                </div>
                <div className={`${styles.statusBadge} ${
                  listing.status === 'sold' ? styles.soldBadge : 
                  listing.status === 'deleted' ? styles.deletedBadge : 
                  styles.activeBadge
                }`}>
                  {listing.status === 'sold' ? 'Sold' : 
                   listing.status === 'deleted' ? 'Deleted' : 
                   'Active'}
                </div>
              </div>

              <div className={styles.listingDetails}>
                {listing.details && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Details:</span>
                    <span className={styles.detailValue}>{listing.details}</span>
                  </div>
                )}
                {listing.measurements && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Measurements:</span>
                    <span className={styles.detailValue}>{listing.measurements} {listing.measurementUnit}</span>
                  </div>
                )}
                {listing.category && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Category:</span>
                    <span className={styles.detailValue}>{listing.category}</span>
                  </div>
                )}
              </div>

              <div className={styles.listingFooter}>
                <div className={styles.listingDate}>
                  Posted on {formatDate(listing.createdAt)}
                </div>
                <div className={styles.listingViews}>
                  {listing.views || 0} views
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
