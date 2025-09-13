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
  onSnapshot
} from 'firebase/firestore'

// Notification types
export const NOTIFICATION_TYPES = {
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMENT_LIKE: 'comment_like',
  LISTING_REQUEST: 'listing_request'
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
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId)
  )

  return onSnapshot(q, (snapshot) => {
    const notifications = []
    snapshot.docs.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // Sort by createdAt
    notifications.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
      return bTime - aTime
    })

    callback(notifications)
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
