import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch } from 'firebase/firestore'
import styles from '../../styles/modules/reports.module.css'

export default function Reports() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState('reports')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user)
        loadUserReports(user.uid)
        
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'Users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
        }
      } else {
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadUserReports = (userId) => {
    console.log('Loading reports for user:', userId)
    try {
      const reportsRef = collection(db, 'reports')
      const q = query(
        reportsRef,
        where('reporterId', '==', userId)
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Reports snapshot received, count:', snapshot.docs.length)
        const reportsData = snapshot.docs.map(doc => {
          const data = doc.data()
          console.log('Report document:', doc.id, 'AI Validation:', data.aiValidationResult)
          return {
            id: doc.id,
            ...data
          }
        })
        
        // Sort by createdAt in memory instead of in query
        reportsData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
          return bTime - aTime
        })
        
        console.log('Final reports data with statuses:', reportsData.map(r => ({ id: r.id, status: r.status })))
        setReports(reportsData)
        setLoading(false)
      }, (error) => {
        console.error('Error in reports snapshot listener:', error)
        setLoading(false)
      })

      return unsubscribe
    } catch (error) {
      console.error('Error loading reports:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (report) => {
    const aiResult = report.aiValidationResult || report.aiValidation
    if (aiResult) {
      return aiResult.verdict === 'VALID' ? '#4caf50' : '#9e9e9e'
    }
    return '#ff9100' // Processing
  }

  const getStatusText = (report) => {
    const aiResult = report.aiValidationResult || report.aiValidation
    if (aiResult) {
      return aiResult.verdict === 'VALID' ? 'Valid' : 'Invalid'
    }
    return 'Processing'
  }

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
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSwitchRole = () => {
    // Navigate to dashboard where role switching is handled
    router.push('/dashboard')
  }

  const handleReportClick = (report) => {
    console.log('Report clicked:', report)
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setSelectedReport(null)
    // Re-enable body scroll
    document.body.style.overflow = 'auto'
  }

  const handleDeleteAll = async () => {
    if (reports.length === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete all ${reports.length} reports? This action cannot be undone.`)
    
    if (confirmed) {
      try {
        const batch = writeBatch(db)
        
        reports.forEach((report) => {
          const reportRef = doc(db, 'reports', report.id)
          batch.delete(reportRef)
        })
        
        await batch.commit()
        console.log('All reports deleted successfully')
      } catch (error) {
        console.error('Error deleting all reports:', error)
        alert('Failed to delete reports. Please try again.')
      }
    }
  }

  // Cleanup on unmount and ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showReportModal) {
        closeReportModal()
      }
    }

    if (showReportModal) {
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscKey)
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [showReportModal])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your reports...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>My Reports</h1>
          </div>
          {reports.length > 0 && (
            <div className={styles.headerRight}>
              <button 
                className={styles.deleteAllButton}
                onClick={handleDeleteAll}
              >
                Delete All
              </button>
            </div>
          )}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className={styles.emptyState}>
          <img src="/assets/icons/triangle-warning.png" alt="No reports" className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No Reports Yet</h3>
          <p className={styles.emptyText}>
            You haven't submitted any reports yet. You can report inappropriate posts from the dashboard.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <div className={styles.headerReportType}>Report Type</div>
            <div className={styles.headerReportedUser}>Reported User</div>
            <div className={styles.headerPostContent}>Post Content</div>
            <div className={styles.headerStatus}>Status</div>
            <div className={styles.headerDate}>Date & Time</div>
          </div>
          
          <div className={styles.reportsList}>
            {reports.map((report) => (
              <div 
                key={report.id} 
                className={styles.reportCard}
                onClick={() => handleReportClick(report)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.reportType} title={report.contentType || report.reportType || 'Unknown Type'}>
                  {truncateText(
                    report.contentType === 'post' ? 'Post' :
                    report.contentType === 'comment' ? 'Comment' :
                    report.contentType === 'listing' ? 'Listing' :
                    report.contentType === 'message' ? 'Message' :
                    report.reportType || 'Unknown Type',
                    20
                  )}
                </div>
                
                <div className={styles.reportedUser} title={report.reportedUserName || report.postAuthor || 'Unknown User'}>
                  {truncateText(report.reportedUserName || report.postAuthor || 'Unknown User', 25)}
                </div>
                
                <div className={styles.postContent} title={report.postContent || 'No content'}>
                  {truncateText(report.postContent || 'No content', 40)}
                </div>
                
                <div 
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(report) }}
                >
                  {getStatusText(report)}
                </div>
                
                <div className={styles.dateTime}>
                  {formatDate(report.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={closeReportModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Report Details</h2>
              <button className={styles.closeButton} onClick={closeReportModal}>×</button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.infoSection}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Status</span>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(selectedReport) }}
                  >
                    {getStatusText(selectedReport)}
                  </span>
                </div>
              </div>

              <div className={styles.infoSection}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Reported User</span>
                  <span className={styles.infoValue}>{selectedReport.reportedUserName || selectedReport.postAuthor || 'Unknown User'}</span>
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Report Type:</span>
                  <span className={styles.modalValue}>
                    {selectedReport.contentType === 'post' ? 'Post' :
                     selectedReport.contentType === 'comment' ? 'Comment' :
                     selectedReport.contentType === 'listing' ? 'Listing' :
                     selectedReport.contentType === 'message' ? 'Message' :
                     selectedReport.reportType || 'Unknown'}
                  </span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Date Submitted:</span>
                  <span className={styles.modalValue}>{formatDate(selectedReport.createdAt)}</span>
                </div>
              </div>

              <div className={styles.modalSection}>
                <h3>Post Content</h3>
                <div className={styles.postContentBox}>
                  {selectedReport.postContent || 'No content available'}
                </div>
                {selectedReport.postImageUrl && (
                  <div className={styles.postImageContainer}>
                    <img src={selectedReport.postImageUrl} alt="Reported post" className={styles.postImage} />
                  </div>
                )}
              </div>

              <div className={styles.modalSection}>
                <h3>AI Analysis</h3>
                {(() => {
                  const aiResult = selectedReport.aiValidationResult || selectedReport.aiValidation
                  if (aiResult) {
                    return (
                      <>
                        {aiResult.reason && (
                          <div className={styles.analysisBox}>
                            {aiResult.reason}
                          </div>
                        )}
                        {/* Only show category if report is valid */}
                        {aiResult.verdict === 'VALID' && (
                          <div className={styles.modalRow}>
                            <span className={styles.modalLabel}>Category:</span>
                            <span className={styles.modalValue}>
                              {aiResult.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
                            </span>
                          </div>
                        )}
                      </>
                    )
                  } else {
                    return (
                      <div className={styles.modalRow}>
                        <span className={styles.modalValue}>AI analysis is being processed...</span>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
