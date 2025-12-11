// Test Notification System
// Run this in browser console while logged in to test notifications

// Test 1: Check if notification service is available
console.log('🧪 Testing Notification System...')

// Test 2: Check current user
const testCurrentUser = () => {
  const user = window.localStorage.getItem('user')
  console.log('👤 Current User:', user ? 'Logged in' : 'Not logged in')
  return user
}

// Test 3: Check Firebase connection
const testFirebaseConnection = async () => {
  try {
    const { db } = await import('./src/lib/firebase')
    console.log('🔥 Firebase:', db ? 'Connected' : 'Not connected')
    return db
  } catch (error) {
    console.error('❌ Firebase Error:', error)
    return null
  }
}

// Test 4: Manually create a test notification
const createTestNotification = async (userId) => {
  try {
    const { db } = await import('./src/lib/firebase')
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    
    const testNotification = {
      type: 'post_like',
      toUserId: userId,
      fromUserId: 'test_user',
      fromUserName: 'Test User',
      postId: 'test_post_123',
      title: 'Test Notification',
      message: 'This is a test notification',
      read: false,
      createdAt: serverTimestamp(),
      actionType: 'like',
      actionText: 'liked your post'
    }
    
    const docRef = await addDoc(collection(db, 'notifications'), testNotification)
    console.log('✅ Test notification created with ID:', docRef.id)
    console.log('📬 Check your notification bell!')
    return docRef.id
  } catch (error) {
    console.error('❌ Error creating test notification:', error)
    return null
  }
}

// Test 5: Check existing notifications
const checkNotifications = async (userId) => {
  try {
    const { db } = await import('./src/lib/firebase')
    const { collection, query, where, getDocs } = await import('firebase/firestore')
    
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    console.log('📊 Total notifications:', snapshot.size)
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`${index + 1}. ${data.type} - ${data.message} (Read: ${data.read})`)
    })
    
    return snapshot.size
  } catch (error) {
    console.error('❌ Error checking notifications:', error)
    return 0
  }
}

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting notification tests...\n')
  
  // Get current user ID from your app
  // You'll need to replace 'YOUR_USER_ID' with actual user ID
  const userId = 'YOUR_USER_ID' // Replace this!
  
  if (userId === 'YOUR_USER_ID') {
    console.log('⚠️ Please replace YOUR_USER_ID with your actual user ID')
    console.log('💡 You can find it by checking the Users collection in Firebase')
    return
  }
  
  testCurrentUser()
  await testFirebaseConnection()
  await checkNotifications(userId)
  
  console.log('\n📝 To create a test notification, run:')
  console.log(`createTestNotification('${userId}')`)
}

// Export functions for manual testing
if (typeof window !== 'undefined') {
  window.testNotifications = {
    runAllTests,
    createTestNotification,
    checkNotifications,
    testCurrentUser,
    testFirebaseConnection
  }
  
  console.log('✅ Notification test functions loaded!')
  console.log('📝 Run: testNotifications.runAllTests()')
}

// Instructions
console.log(`
🧪 NOTIFICATION TESTING GUIDE
=============================

1. Open browser console (F12)
2. Make sure you're logged in
3. Run: testNotifications.checkNotifications('YOUR_USER_ID')
4. Run: testNotifications.createTestNotification('YOUR_USER_ID')
5. Check if notification bell shows badge
6. Click bell to see notification dropdown

Replace 'YOUR_USER_ID' with your actual Firebase user ID
`)
