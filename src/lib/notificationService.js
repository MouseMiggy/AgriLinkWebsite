import { db } from './firebase'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  serverTimestamp,
  updateDoc,
  doc,
  onSnapshot,
  getDoc
} from 'firebase/firestore'

// Notification types
export const NOTIFICATION_TYPES = {
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMENT_REPLY: 'comment_reply',
  COMMENT_LIKE: 'comment_like',
  LISTING_REQUEST: 'listing_request',
  REPORT_STATUS: 'report_status'
}

// Get notifications for a user with real-time updates
export const getUserNotifications = async (userId, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    const notifications = []

    querySnapshot.docs.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // Sort by createdAt in JavaScript
    notifications.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
      return bTime - aTime // Descending order (newest first)
    })

    return notifications.slice(0, limitCount)
  } catch (error) {
    console.error('Error getting notifications:', error)
    return []
  }
}

// Get unread notification count
export const getUnreadNotificationCount = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    console.error('Error getting unread notification count:', error)
    return 0
  }
}

// Listen to notifications with real-time updates
export const listenToNotifications = (userId, callback) => {
  console.log('Setting up real-time notification listener for user:', userId)
  
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId)
  )

  return onSnapshot(q, (snapshot) => {
    console.log('Real-time notification update received, count:', snapshot.docs.length)
    
    const notifications = []
    snapshot.docs.forEach(doc => {
      const notificationData = {
        id: doc.id,
        ...doc.data()
      }
      notifications.push(notificationData)
      console.log('Notification:', notificationData)
    })

    // Sort notifications by createdAt (newest first)
    notifications.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
      return bTime - aTime
    })
    
    callback(notifications)
  }, (error) => {
    console.error('Error in notification listener:', error)
  })
}

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    if (!notificationId) {
      console.error('No notification ID provided')
      return
    }
    
    const notificationRef = doc(db, 'notifications', notificationId)
    await updateDoc(notificationRef, {
      read: true
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    )

    const querySnapshot = await getDocs(q)
    
    const updatePromises = querySnapshot.docs.map(docSnapshot => {
      return updateDoc(doc(db, 'notifications', docSnapshot.id), {
        read: true
      })
    })
    
    await Promise.all(updatePromises)
    console.log(`Marked ${updatePromises.length} notifications as read`)
    return updatePromises.length
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return 0
  }
}

// Debug function to check notifications
export const debugNotifications = async (userId) => {
  try {
    console.log('🔍 Debugging notifications for user:', userId)
    
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    console.log('📊 Total notifications found:', querySnapshot.size)
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log('📝 Notification:', {
        id: doc.id,
        type: data.type,
        fromUser: data.fromUserName,
        message: data.message,
        read: data.read,
        createdAt: data.createdAt
      })
    })
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error debugging notifications:', error)
    return []
  }
}

// Send post like notification
export const sendPostLikeNotification = async (postId, postOwnerId, likerUserId, likerName) => {
  try {
    console.log('Attempting to send like notification:', { postId, postOwnerId, likerUserId, likerName })
    
    // Don't send notification if user likes their own post
    if (postOwnerId === likerUserId) {
      console.log('Skipping notification - user liked their own post')
      return
    }

    // Get the actual user data from Firestore to ensure we have the correct name
    let actualUserName = likerName
    try {
      const userDoc = await getDoc(doc(db, 'Users', likerUserId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        actualUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || likerName
        console.log('Found user data for notification:', actualUserName)
      } else {
        // Try alternative collection name
        const userDoc2 = await getDoc(doc(db, 'Users', likerUserId))
        if (userDoc2.exists()) {
          const userData = userDoc2.data()
          actualUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || likerName
          console.log('Found user data in Users collection:', actualUserName)
        }
      }
    } catch (userError) {
      console.log('Could not fetch user data, using provided name:', likerName)
    }

    // Check if notification already exists for this like
    const existingNotificationQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', postOwnerId),
      where('fromUserId', '==', likerUserId),
      where('type', '==', NOTIFICATION_TYPES.POST_LIKE),
      where('postId', '==', postId)
    )

    const existingNotifications = await getDocs(existingNotificationQuery)
    
    // If notification already exists, don't create duplicate
    if (!existingNotifications.empty) {
      console.log('Notification already exists, skipping duplicate')
      return
    }

    const notification = {
      type: NOTIFICATION_TYPES.POST_LIKE,
      toUserId: postOwnerId,
      fromUserId: likerUserId,
      fromUserName: actualUserName,
      postId: postId,
      title: 'New Like',
      message: `${actualUserName} liked your post`,
      read: false,
      createdAt: serverTimestamp(),
      // Additional user info for display
      actionType: 'like',
      actionText: 'liked your post'
    }

    console.log('Creating notification:', notification)
    const docRef = await addDoc(collection(db, 'notifications'), notification)
    console.log('Post like notification sent successfully with ID:', docRef.id)
  } catch (error) {
    console.error('Error sending post like notification:', error)
  }
}

// Send comment notification
export const sendCommentNotification = async (postId, postOwnerId, commenterUserId, commenterName, commentText) => {
  try {
    console.log('Attempting to send comment notification:', { postId, postOwnerId, commenterUserId, commenterName, commentText })
    
    // Don't send notification if user comments on their own post
    if (postOwnerId === commenterUserId) {
      console.log('Skipping notification - user commented on their own post')
      return
    }

    // Get the actual user data from Firestore to ensure we have the correct name
    let actualUserName = commenterName
    try {
      const userDoc = await getDoc(doc(db, 'Users', commenterUserId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        actualUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || commenterName
        console.log('Found user data for comment notification:', actualUserName)
      } else {
        // Try alternative collection name
        const userDoc2 = await getDoc(doc(db, 'Users', commenterUserId))
        if (userDoc2.exists()) {
          const userData = userDoc2.data()
          actualUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || commenterName
          console.log('Found user data in Users collection for comment:', actualUserName)
        }
      }
    } catch (userError) {
      console.log('Could not fetch user data for comment, using provided name:', commenterName)
    }

    const notification = {
      type: NOTIFICATION_TYPES.POST_COMMENT,
      toUserId: postOwnerId,
      fromUserId: commenterUserId,
      fromUserName: actualUserName,
      postId: postId,
      title: 'New Comment',
      message: `${actualUserName} commented on your post: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      read: false,
      createdAt: serverTimestamp(),
      // Additional user info for display
      actionType: 'comment',
      actionText: 'commented on your post',
      commentPreview: commentText.substring(0, 100)
    }

    console.log('Creating comment notification:', notification)
    const docRef = await addDoc(collection(db, 'notifications'), notification)
    console.log('Comment notification sent successfully with ID:', docRef.id)
  } catch (error) {
    console.error('Error sending comment notification:', error)
  }
}

// Send comment reply notification
export const sendCommentReplyNotification = async (postId, originalCommenterId, replierUserId, replierName, replyText) => {
  try {
    console.log('Attempting to send reply notification:', { postId, originalCommenterId, replierUserId, replierName, replyText })
    
    // Don't send notification if user replies to their own comment
    if (originalCommenterId === replierUserId) {
      console.log('Skipping notification - user replied to their own comment')
      return
    }

    // Get the actual user data from Firestore
    let actualUserName = replierName
    try {
      const userDoc = await getDoc(doc(db, 'Users', replierUserId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        actualUserName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || replierName
      }
    } catch (userError) {
      console.log('Could not fetch user data for reply, using provided name:', replierName)
    }

    const notification = {
      type: NOTIFICATION_TYPES.COMMENT_REPLY,
      toUserId: originalCommenterId,
      fromUserId: replierUserId,
      fromUserName: actualUserName,
      postId: postId,
      title: 'New Reply',
      message: `${actualUserName} replied to your comment: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
      read: false,
      createdAt: serverTimestamp(),
      actionType: 'reply',
      actionText: 'replied to your comment',
      replyPreview: replyText.substring(0, 100)
    }

    console.log('Creating reply notification:', notification)
    const docRef = await addDoc(collection(db, 'notifications'), notification)
    console.log('Reply notification sent successfully with ID:', docRef.id)
  } catch (error) {
    console.error('Error sending reply notification:', error)
  }
}

// Send report status notification
export const sendReportStatusNotification = async (reportedUserId, reportReason, reportStatus, reportDetails = '') => {
  try {
    console.log('Attempting to send report status notification:', { reportedUserId, reportReason, reportStatus })

    const statusMessages = {
      'pending': 'Your content has been reported and is under review.',
      'valid': 'A report against your content was found to be valid.',
      'invalid': 'A report against your content was reviewed and dismissed.',
      'warning': 'You have received a warning regarding your content.'
    }

    const notification = {
      type: NOTIFICATION_TYPES.REPORT_STATUS,
      toUserId: reportedUserId,
      fromUserId: 'system',
      fromUserName: 'AgriLink Moderation',
      title: 'Content Report Update',
      message: statusMessages[reportStatus] || 'Your content has been reported.',
      reportReason: reportReason,
      reportStatus: reportStatus,
      reportDetails: reportDetails,
      read: false,
      createdAt: serverTimestamp(),
      actionType: 'report',
      actionText: 'reported'
    }

    console.log('Creating report status notification:', notification)
    const docRef = await addDoc(collection(db, 'notifications'), notification)
    console.log('Report status notification sent successfully with ID:', docRef.id)
  } catch (error) {
    console.error('Error sending report status notification:', error)
  }
}
