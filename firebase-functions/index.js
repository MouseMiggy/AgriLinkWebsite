const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Update report status after AI analysis
exports.updateReportStatus = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { reportId, status, aiDecision } = req.body;

    if (!reportId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update report in Firestore
    const reportRef = db.collection('reports').doc(reportId);
    
    const updateData = {
      status: status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (aiDecision) {
      updateData.aiDecision = aiDecision;
    }

    await reportRef.update(updateData);

    // Log the update for audit purposes
    await db.collection('report_audit').add({
      reportId: reportId,
      action: 'status_update',
      oldStatus: 'processing',
      newStatus: status,
      aiDecision: aiDecision,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Report status updated successfully',
      reportId: reportId,
      status: status
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Send notification to users
exports.sendNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { userId, type, title, message, reportData } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create notification document
    const notificationData = {
      userId: userId,
      type: type,
      title: title,
      message: message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reportId: reportData?.reportId || null,
      postId: reportData?.postId || null
    };

    // Add notification to Firestore
    const notificationRef = await db.collection('notifications').add(notificationData);

    // Update user's unread notification count
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      unreadNotifications: admin.firestore.FieldValue.increment(1),
      lastNotificationAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log notification for audit purposes
    await db.collection('notification_audit').add({
      notificationId: notificationRef.id,
      userId: userId,
      type: type,
      reportId: reportData?.reportId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Notification sent successfully',
      notificationId: notificationRef.id
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Handle post actions (warn, remove, restrict)
exports.handlePostAction = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { postId, action, reportData } = req.body;

    if (!postId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    let actionTaken = 'none';

    switch (action.toUpperCase()) {
      case 'WARN':
        updateData.warned = true;
        updateData.warnedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.warnReason = reportData?.reportType || 'Community guidelines violation';
        actionTaken = 'warned';
        break;

      case 'REMOVE':
        updateData.removed = true;
        updateData.removedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.removeReason = reportData?.reportType || 'Community guidelines violation';
        updateData.visible = false;
        actionTaken = 'removed';
        break;

      case 'RESTRICT':
        updateData.restricted = true;
        updateData.restrictedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.restrictReason = reportData?.reportType || 'Community guidelines violation';
        updateData.visibility = 'restricted';
        actionTaken = 'restricted';
        break;

      case 'NONE':
      default:
        actionTaken = 'none';
        break;
    }

    if (actionTaken !== 'none') {
      await postRef.update(updateData);
    }

    // Log the action for audit purposes
    await db.collection('moderation_audit').add({
      postId: postId,
      action: actionTaken,
      reportId: reportData?.reportId || null,
      moderatedBy: 'ai_system',
      reason: reportData?.reportType || 'Unknown',
      aiDecision: reportData?.aiDecision || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      success: true, 
      message: `Post action completed: ${actionTaken}`,
      postId: postId,
      action: actionTaken
    });

  } catch (error) {
    console.error('Error handling post action:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get user's reports (for the reports page)
exports.getUserReports = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // Get user's reports from Firestore
    const reportsQuery = db.collection('reports')
      .where('reporterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50);

    const snapshot = await reportsQuery.get();
    const reports = [];

    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({ 
      success: true, 
      reports: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('Error getting user reports:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Create initial report record (called from frontend)
exports.createReport = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const reportData = req.body;

    // Validate required fields
    const requiredFields = ['reportId', 'reporterId', 'reportedUserId', 'postId', 'reportType'];
    for (const field of requiredFields) {
      if (!reportData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Create report document
    const reportDoc = {
      ...reportData,
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firestore
    await db.collection('reports').doc(reportData.reportId).set(reportDoc);

    // Log report creation
    await db.collection('report_audit').add({
      reportId: reportData.reportId,
      action: 'created',
      reporterId: reportData.reporterId,
      reportType: reportData.reportType,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Report created successfully',
      reportId: reportData.reportId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'AgriLink Report Validation System'
  });
});
