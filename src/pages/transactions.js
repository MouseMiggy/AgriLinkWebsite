import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../lib/firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import styles from '../../styles/modules/transactions.module.css'

const Transactions = ({ user }) => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  useEffect(() => {
    if (!db || !user) return

    setLoading(true)
    setError(null)

    // Query transactions from Firestore collection
    // Simplified query to avoid index issues for now
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactionData = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          transactionData.push({
            id: doc.id,
            ...data,
            dateAdded: data.dateAdded?.toDate() || new Date(),
            dateSold: data.dateSold?.toDate() || new Date()
          })
        })
        // Sort client-side instead of server-side to avoid index issues
        transactionData.sort((a, b) => b.dateSold - a.dateAdded)
        setTransactions(transactionData)
        setLoading(false)
      },
      (err) => {
        console.error('Error loading transactions:', err)
        // If collection doesn't exist or permission denied, show empty state instead of error
        if (err.code === 'permission-denied' || err.code === 'unavailable') {
          setTransactions([])
          setLoading(false)
        } else {
          setError('Failed to load transactions')
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [db, user])

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const openReceiptModal = (transaction) => {
    setSelectedTransaction(transaction)
    setShowReceiptModal(true)
  }

  const closeReceiptModal = () => {
    setShowReceiptModal(false)
    setSelectedTransaction(null)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Transaction History</h1>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading transactions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Transaction History</h1>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
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
          <h1 className={styles.title}>Transaction History</h1>
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
                <th className={styles.columnHeader}>Buyer Name</th>
                <th className={styles.columnHeader}>Date Added</th>
                <th className={styles.columnHeader}>Date Sold</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyTableCell}>
                    <div className={styles.emptyTableMessage}>
                      <div className={styles.emptyIcon}>
                        <img src="/assets/icons/time-past.png" alt="No transactions" />
                      </div>
                      <h3 className={styles.emptyTitle}>No Transactions Yet</h3>
                      <p className={styles.emptyDescription}>
                        Your completed transactions will appear here once you complete listings.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={styles.tableRow}
                    onClick={() => openReceiptModal(transaction)}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.listingName}>
                        {transaction.listingName || 'N/A'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.listingDetails}>
                        {transaction.listingDetails || 'N/A'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.price}>
                        ₱{transaction.price || '0'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.buyerName}>
                        {transaction.buyerName || 'N/A'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.date}>
                        {formatDate(transaction.dateAdded)}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.date}>
                        {formatDate(transaction.dateSold)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && createPortal(
        <div className={styles.receiptModalOverlay} onClick={closeReceiptModal}>
          <div className={styles.receiptModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.receiptHeader}>
              <h2 className={styles.receiptTitle}>Transaction Receipt</h2>
              <button className={styles.receiptCloseButton} onClick={closeReceiptModal}>
                ×
              </button>
            </div>
            
            {selectedTransaction && (
              <div className={styles.receiptBody}>
                <div className={styles.receiptSection}>
                  <h3 className={styles.receiptSectionTitle}>Transaction Details</h3>
                  <div className={styles.receiptInfo}>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Transaction ID:</span>
                      <span className={styles.receiptValue}>{selectedTransaction.id}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Listing Name:</span>
                      <span className={styles.receiptValue}>{selectedTransaction.listingName || 'N/A'}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Listing Details:</span>
                      <span className={styles.receiptValue}>{selectedTransaction.listingDetails || 'N/A'}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Price:</span>
                      <span className={styles.receiptValue}>₱{selectedTransaction.price || '0'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.receiptSection}>
                  <h3 className={styles.receiptSectionTitle}>Buyer Information</h3>
                  <div className={styles.receiptInfo}>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Buyer Name:</span>
                      <span className={styles.receiptValue}>{selectedTransaction.buyerName || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.receiptSection}>
                  <h3 className={styles.receiptSectionTitle}>Timeline</h3>
                  <div className={styles.receiptInfo}>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Date Added:</span>
                      <span className={styles.receiptValue}>{formatDate(selectedTransaction.dateAdded)}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>Date Sold:</span>
                      <span className={styles.receiptValue}>{formatDate(selectedTransaction.dateSold)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.receiptFooter}>
                  <div className={styles.totalAmount}>
                    <span className={styles.totalLabel}>Total Amount:</span>
                    <span className={styles.totalValue}>₱{selectedTransaction.price || '0'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Transactions
