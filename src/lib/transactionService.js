import { db } from './firebase'
import { doc, setDoc, collection, query, where, getDocs, getDoc, orderBy, limit, onSnapshot } from 'firebase/firestore'

// Create a completed transaction record
export const createTransaction = async (transactionData) => {
  try {
    console.log('💾 Creating transaction record:', transactionData)
    
    // Check if transaction already exists for this chat
    const existingTransactionQuery = query(
      collection(db, 'transactions'),
      where('chatId', '==', transactionData.chatId)
    )
    
    const existingSnapshot = await getDocs(existingTransactionQuery)
    if (!existingSnapshot.empty) {
      console.log('⚠️ Transaction already exists for chat:', transactionData.chatId)
      return existingSnapshot.docs[0].data()
    }
    
    const transactionRef = doc(collection(db, 'transactions'))
    const transaction = {
      id: transactionRef.id,
      buyerId: transactionData.buyerId,
      sellerId: transactionData.sellerId,
      listingId: transactionData.listingId,
      listingName: transactionData.listingName,
      listingDetails: transactionData.listingDetails || '',
      price: transactionData.price,
      dateAdded: transactionData.dateAdded,
      dateCompleted: new Date(),
      buyerName: transactionData.buyerName,
      sellerName: transactionData.sellerName,
      chatId: transactionData.chatId,
      status: 'completed',
      createdAt: new Date()
    }
    
    await setDoc(transactionRef, transaction)
    console.log('✅ Transaction created successfully:', transaction.id)
    return transaction
  } catch (error) {
    console.error('❌ Error creating transaction:', error)
    throw error
  }
}

// Get transactions for a specific user (both as buyer and seller)
export const getUserTransactions = async (userId) => {
  try {
    console.log('📋 Fetching transactions for user:', userId)
    
    // Query transactions where user is either buyer or seller
    const buyerQuery = query(
      collection(db, 'transactions'),
      where('buyerId', '==', userId),
      orderBy('dateCompleted', 'desc')
    )
    
    const sellerQuery = query(
      collection(db, 'transactions'),
      where('sellerId', '==', userId),
      orderBy('dateCompleted', 'desc')
    )
    
    const [buyerSnapshot, sellerSnapshot] = await Promise.all([
      getDocs(buyerQuery),
      getDocs(sellerQuery)
    ])
    
    const buyerTransactions = buyerSnapshot.docs.map(doc => ({
      ...doc.data(),
      role: 'buyer'
    }))
    
    const sellerTransactions = sellerSnapshot.docs.map(doc => ({
      ...doc.data(),
      role: 'seller'
    }))
    
    // Combine and sort by date completed
    const allTransactions = [...buyerTransactions, ...sellerTransactions].sort((a, b) => 
      new Date(b.dateCompleted) - new Date(a.dateCompleted)
    )
    
    console.log(`✅ Found ${allTransactions.length} transactions for user:`, userId)
    return allTransactions
  } catch (error) {
    console.error('❌ Error fetching user transactions:', error)
    throw error
  }
}

// Get listing details for transaction
export const getListingDetails = async (listingId) => {
  try {
    console.log('🔍 Fetching listing details for:', listingId)
    
    const listingRef = doc(db, 'livestock_listings', listingId)
    const listingDoc = await getDoc(listingRef)
    
    if (listingDoc.exists()) {
      const listingData = listingDoc.data()
      console.log('✅ Listing details found:', listingData.title)
      return {
        listingName: listingData.title || 'Untitled Listing',
        listingDetails: listingData.description || listingData.details || '',
        price: listingData.price || 0,
        dateAdded: listingData.createdAt || new Date()
      }
    } else {
      console.log('❌ Listing not found:', listingId)
      return {
        listingName: 'Unknown Listing',
        listingDetails: 'Listing details not available',
        price: 0,
        dateAdded: new Date()
      }
    }
  } catch (error) {
    console.error('❌ Error fetching listing details:', error)
    return {
      listingName: 'Error Loading Listing',
      listingDetails: 'Could not load listing details',
      price: 0,
      dateAdded: new Date()
    }
  }
}

// Get user details for transaction
export const getUserDetails = async (userId) => {
  try {
    console.log('👤 Fetching user details for:', userId)
    
    const userRef = doc(db, 'Users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      console.log('✅ User details found:', fullName)
      return fullName || userData.email?.split('@')[0] || 'Unknown User'
    } else {
      console.log('❌ User not found:', userId)
      return 'Unknown User'
    }
  } catch (error) {
    console.error('❌ Error fetching user details:', error)
    return 'Error Loading User'
  }
}
