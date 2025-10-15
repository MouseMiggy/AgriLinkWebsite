// Reports Component - Main Reports View
import React, { useState, useEffect } from 'react'
import { useReports } from '../../hooks/useReports'
import { formatDate } from '../../utils/dateUtils'
import LoadingSpinner from '../ui/LoadingSpinner'
import ReportCard from './ReportCard'
import ReportFilters from './ReportFilters'
import styles from './ReportsView.module.css'

const ReportsView = ({ user }) => {
  const { reports, loading, loadReports, getFilteredReports, getReportCounts } = useReports(user)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user) {
      loadReports()
    }
  }, [user])

  const filteredReports = getFilteredReports(filter)
  const counts = getReportCounts()

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingSpinner text="Loading your reports..." />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>My Reports</h2>
          <p>Track the status of your submitted reports</p>
        </div>
        
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No Reports Yet</h3>
          <p>You haven't submitted any reports yet. When you report a post, it will appear here with its status and details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>My Reports</h2>
        <p>Track the status of your submitted reports</p>
      </div>
      
      <ReportFilters
        filter={filter}
        setFilter={setFilter}
        counts={counts}
      />

      <div className={styles.reportsList}>
        {filteredReports.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3>No {filter === 'all' ? '' : filter} Reports Found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't submitted any reports yet."
                : `No reports with status "${filter}" found. Try a different filter.`
              }
            </p>
          </div>
        ) : (
          filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ReportsView
