// Custom Hook - Reports Data Management
import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export const useReports = (user) => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load user's reports
  const loadReports = async () => {
    if (!user) {
      console.log('No user found, cannot load reports')
      return
    }
    
    console.log('Loading reports for user:', user.uid)
    setLoading(true)
    
    try {
      const reportsRef = collection(db, 'reports')
      const q = query(
        reportsRef,
        where('reporterId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      console.log('Executing reports query...')
      const snapshot = await getDocs(q)
      console.log('Reports query result:', snapshot.size, 'documents found')
      
      const reportsData = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Report document:', doc.id, data)
        return {
          id: doc.id,
          ...data
        }
      })
      
      setReports(reportsData)
      setLoading(false)
      console.log('Reports loaded successfully:', reportsData.length, 'reports')
      
    } catch (error) {
      console.error('Error loading reports:', error)
      setReports([])
      setLoading(false)
      setError(error)
    }
  }

  // Submit new report
  const submitReport = async (reportData) => {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...reportData,
        reporterId: user.uid,
        status: 'processing',
        createdAt: serverTimestamp()
      })
      
      console.log('Report saved to Firebase with ID:', docRef.id)
      
      // Reload reports to show the new one
      await loadReports()
      
      return docRef.id
    } catch (error) {
      console.error('Error submitting report:', error)
      throw error
    }
  }

  // Filter reports by status
  const getFilteredReports = (filter) => {
    if (filter === 'all') return reports
    return reports.filter(report => report.status === filter)
  }

  // Get report counts by status
  const getReportCounts = () => {
    return {
      all: reports.length,
      processing: reports.filter(r => r.status === 'processing').length,
      valid: reports.filter(r => r.status === 'valid').length,
      invalid: reports.filter(r => r.status === 'invalid').length
    }
  }

  return {
    reports,
    loading,
    error,
    loadReports,
    submitReport,
    getFilteredReports,
    getReportCounts
  }
}
