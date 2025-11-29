// Cloud Function for scheduled inactive chat monitoring
const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()

// Import the server-side inactive chat monitor
const ServerInactiveChatMonitor = require('./serverInactiveChatMonitor')

// Scheduled function to run every 24 hours
exports.runChatMonitoring = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Manila') // Set to your timezone
  .onRun(async (context) => {
    console.log('🚀 Starting scheduled chat monitoring cycle...')
    
    try {
      const result = await ServerInactiveChatMonitor.runMonitoringCycle()
      
      if (result.success) {
        console.log('✅ Chat monitoring cycle completed successfully:', result.results)
        return null
      } else {
        console.error('❌ Chat monitoring cycle failed:', result.error)
        return null
      }
    } catch (error) {
      console.error('❌ Critical error in chat monitoring cycle:', error)
      return null
    }
  })

// Manual trigger for testing (can be called via HTTP)
exports.triggerChatMonitoring = functions.https.onRequest(async (req, res) => {
  console.log('🔧 Manual chat monitoring trigger activated')
  
  try {
    const result = await ServerInactiveChatMonitor.runMonitoringCycle()
    
    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'Chat monitoring cycle completed',
        results: result.results
      })
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Chat monitoring cycle failed',
        error: result.error,
        results: result.results
      })
    }
  } catch (error) {
    console.error('❌ Manual trigger error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Critical error in manual trigger',
      error: error.message
    })
  }
})
