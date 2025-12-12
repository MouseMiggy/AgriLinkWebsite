import React, { useState, useEffect } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import styles from '../../styles/modules/listing-history.module.css'

export default function ListingHistory() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
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
          setUserRole(null)
        }
      } else {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
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
      setHasLoaded(true)
    }, (error) => {
      console.error('Error fetching listings:', error)
      setLoading(false)
      setHasLoaded(true)
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
        day: 'numeric'
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

  if (loading || !hasLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Listing History</h1>
            </div>
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading history...</p>
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

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.transactionsTableContainer}>
          <table className={styles.transactionsTable}>
            <thead>
              <tr className={styles.tableHeader}>
                <th className={styles.columnHeader}>Listing Name</th>
                <th className={styles.columnHeader}>Listing Details</th>
                <th className={styles.columnHeader}>Price</th>
                <th className={styles.columnHeader}>Quantity</th>
                <th className={styles.columnHeader}>Date Added</th>
                <th className={styles.columnHeader}>Date Sold</th>
                <th className={styles.columnHeader}>Date Deleted</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyTableCell}>
                    <div className={styles.emptyTableMessage}>
                      <div className={styles.emptyIcon}>
                        <img src="/assets/icons/time-past.png" alt="No listings" />
                      </div>
                      <h3 className={styles.emptyTitle}>No Listing History Yet</h3>
                      <p className={styles.emptyDescription}>
                        Your sold and deleted listings will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr 
                    key={listing.id} 
                    className={styles.tableRow}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.listingName}>
                        {listing.name || listing.title || listing.productName || '-'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.listingDetails}>
                        {truncateText(listing.description || listing.details || listing.info || '-', 100)}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={`${styles.price} ${(listing.isFree || listing.price === 'Free') ? styles.free : ''}`}>
                        {formatPrice(listing.price, listing.isFree)}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.quantity}>
                        {listing.quantity || listing.amount || listing.stock || '-'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.date}>
                        {formatDate(listing.createdAt) || '-'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.date}>
                        {(() => {
                          console.log('🔍 Listing data for Date Sold check:', {
                            id: listing.id,
                            status: listing.status,
                            dateSold: listing.dateSold,
                            soldAt: listing.soldAt,
                            dateDeleted: listing.dateDeleted,
                            deletedAt: listing.deletedAt
                          })
                          console.log('📋 Raw listing object:', JSON.stringify(listing, null, 2))
                          
                          if (listing.status === 'sold') {
                            const dateField = listing.dateSold || listing.soldAt
                            return dateField ? formatDate(dateField) : 'N/A'
                          } else {
                            return 'N/A'  // Show N/A for deleted listings
                          }
                        })()}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.date}>
                        {(() => {
                          if (listing.status === 'deleted') {
                            const dateField = listing.dateDeleted || listing.deletedAt
                            console.log('🔍 Deleted listing data:', listing)
                            console.log('📅 dateDeleted field:', listing.dateDeleted)
                            console.log('📅 deletedAt field:', listing.deletedAt)
                            console.log('📅 Using date field:', dateField)
                            return dateField ? formatDate(dateField) : 'N/A'
                          } else {
                            return 'N/A'  // Show N/A for sold listings
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
