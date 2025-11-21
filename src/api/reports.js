// Backend API - Reports Service
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export class ReportsAPI {
  static async submitReport(reportData) {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...reportData,
        status: 'processing',
        createdAt: serverTimestamp()
      })
      
      console.log('Report saved to Firebase with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('Error submitting report:', error)
      throw new Error('Failed to submit report')
    }
  }

  static async getUserReports(userId) {
    try {
      const reportsRef = collection(db, 'reports')
      const q = query(
        reportsRef,
        where('reporterId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting user reports:', error)
      throw new Error('Failed to get user reports')
    }
  }

  static async updateReportStatus(reportId, status, aiDecision = null) {
    try {
      const reportRef = doc(db, 'reports', reportId)
      const updateData = {
        status,
        processedAt: serverTimestamp()
      }

      if (aiDecision) {
        updateData.aiDecision = aiDecision
      }

      await updateDoc(reportRef, updateData)
    } catch (error) {
      console.error('Error updating report status:', error)
      throw new Error('Failed to update report status')
    }
  }

  static async sendToWebhook(reportData, webhookUrl) {
    console.log('sendToWebhook is disabled; skipping external webhook call.')
    return
  }

  static async getReportStats(userId) {
    try {
      const reports = await this.getUserReports(userId)
      
      return {
        total: reports.length,
        processing: reports.filter(r => r.status === 'processing').length,
        valid: reports.filter(r => r.status === 'valid').length,
        invalid: reports.filter(r => r.status === 'invalid').length
      }
    } catch (error) {
      console.error('Error getting report stats:', error)
      throw new Error('Failed to get report statistics')
    }
  }
}
