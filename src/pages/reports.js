import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import styles from '../../styles/modules/reports.module.css'

export default function Reports() {
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, processing, valid, invalid
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user)
        loadUserReports(user.uid)
      } else {
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadUserReports = (userId) => {
    try {
      const reportsRef = collection(db, 'reports')
      const q = query(
        reportsRef,
        where('reporterId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setReports(reportsData)
        setLoading(false)
      })

      return unsubscribe
    } catch (error) {
      console.error('Error loading reports:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return '#fa9100'
      case 'valid':
        return '#42b883'
      case 'invalid':
        return '#ff4444'
      default:
        return '#65676b'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'processing':
        return 'Processing'
      case 'valid':
        return 'Valid'
      case 'invalid':
        return 'Invalid'
      default:
        return 'Unknown'
    }
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const goBack = () => {
    router.push('/dashboard')
  }

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
        <button onClick={goBack} className={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <h1 className={styles.title}>My Reports</h1>
        <p className={styles.subtitle}>Track the status of your submitted reports</p>
      </div>

      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({reports.length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'processing' ? styles.active : ''}`}
          onClick={() => setFilter('processing')}
        >
          Processing ({reports.filter(r => r.status === 'processing').length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'valid' ? styles.active : ''}`}
          onClick={() => setFilter('valid')}
        >
          Valid ({reports.filter(r => r.status === 'valid').length})
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'invalid' ? styles.active : ''}`}
          onClick={() => setFilter('invalid')}
        >
          Invalid ({reports.filter(r => r.status === 'invalid').length})
        </button>
      </div>

      <div className={styles.reportsList}>
        {filteredReports.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No reports found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't submitted any reports yet."
                : `No reports with status "${filter}" found.`
              }
            </p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.reportHeader}>
                <div className={styles.reportType}>
                  <span className={styles.typeLabel}>{report.reportType}</span>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(report.status) }}
                  >
                    {getStatusText(report.status)}
                  </span>
                </div>
                <div className={styles.reportDate}>
                  {formatDate(report.createdAt)}
                </div>
              </div>

              <div className={styles.reportContent}>
                <div className={styles.reportedPost}>
                  <h4>Reported Post</h4>
                  <div className={styles.postPreview}>
                    <div className={styles.postAuthor}>
                      By: {report.postAuthor || 'Unknown User'}
                    </div>
                    <div className={styles.postText}>
                      "{report.postContent || 'No content available'}"
                    </div>
                  </div>
                </div>

                {report.description && (
                  <div className={styles.reportDescription}>
                    <h4>Your Description</h4>
                    <p>"{report.description}"</p>
                  </div>
                )}

                {report.aiDecision && (
                  <div className={styles.aiDecision}>
                    <h4>AI Analysis</h4>
                    <div className={styles.decisionDetails}>
                      <div className={styles.decisionRow}>
                        <span className={styles.label}>Decision:</span>
                        <span className={styles.value}>{report.aiDecision.decision}</span>
                      </div>
                      <div className={styles.decisionRow}>
                        <span className={styles.label}>Confidence:</span>
                        <span className={styles.value}>{Math.round((report.aiDecision.confidence || 0) * 100)}%</span>
                      </div>
                      <div className={styles.decisionRow}>
                        <span className={styles.label}>Reasoning:</span>
                        <span className={styles.value}>{report.aiDecision.reasoning}</span>
                      </div>
                      {report.aiDecision.recommendedAction && report.aiDecision.recommendedAction !== 'NONE' && (
                        <div className={styles.decisionRow}>
                          <span className={styles.label}>Action Taken:</span>
                          <span className={styles.value}>{report.aiDecision.recommendedAction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.reportFooter}>
                <div className={styles.reportId}>
                  Report ID: {report.reportId || report.id}
                </div>
                {report.processedAt && (
                  <div className={styles.processedAt}>
                    Processed: {formatDate(report.processedAt)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
