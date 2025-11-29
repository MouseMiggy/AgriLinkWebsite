// Inactive Chat Monitor for AgriLink - Monitors and handles inactive chats
import AgriLinkAgent from './agriLinkAgent'
import { db } from './firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore'

class InactiveChatMonitor {
  
  // Check all chats for inactivity and send warnings
  static async checkAllInactiveChats() {
    try {
      console.log('🔍 Starting inactive chat monitoring...')
      
      // Get all chats that are not completed and haven't been checked recently
      const chatsRef = collection(db, 'chats')
      const q = query(
        chatsRef,
        where('transactionState', '!=', 'completed')
      )
      
      const snapshot = await getDocs(q)
      const inactiveChats = []
      
      for (const chatDoc of snapshot.docs) {
        const chatData = chatDoc.data()
        const chatId = chatDoc.id
        
        // Check if chat needs inactivity check
        const needsCheck = await this.checkChatInactivity(chatId, chatData)
        if (needsCheck.shouldWarn) {
          inactiveChats.push({
            chatId,
            chatData,
            ...needsCheck
          })
        }
      }
      
      console.log(`📊 Found ${inactiveChats.length} inactive chats needing warnings`)
      
      // Send warnings for inactive chats
      for (const inactiveChat of inactiveChats) {
        await this.sendInactivityWarning(inactiveChat)
      }
      
      return {
        success: true,
        totalChatsChecked: snapshot.size,
        warningsSent: inactiveChats.length
      }
      
    } catch (error) {
      console.error('❌ Error checking inactive chats:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Check individual chat for inactivity
  static async checkChatInactivity(chatId, chatData) {
    try {
      const lastMessageTime = chatData.lastMessageTime
      const participantNames = chatData.participantNames || {}
      const inactivityWarningAt = chatData.inactivityWarningAt
      const markedForDeletionAt = chatData.markedForDeletionAt
      
      // Check with AI service using new AgriLinkAgent
      console.log('🤖 Using NEW AgriLinkAgent for inactivity check...')
      
      // For now, implement basic inactivity logic locally since AgriLinkAgent focuses on suggestions
      const now = new Date()
      const lastMessage = lastMessageTime?.toDate ? lastMessageTime.toDate() : new Date(lastMessageTime)
      const daysInactive = Math.floor((now - lastMessage) / (1000 * 60 * 60 * 24))
      
      // Simple inactivity rules: warn after 7 days, mark for deletion after 14 days
      const needsWarning = daysInactive >= 7 && !inactivityWarningAt
      const shouldDelete = daysInactive >= 14 && !markedForDeletionAt
      
      console.log('📊 Inactivity analysis:', {
        chatId,
        daysInactive,
        needsWarning,
        shouldDelete,
        lastWarning: inactivityWarningAt
      })
      
      return {
        success: true,
        daysInactive,
        shouldWarn: needsWarning,
        shouldDelete,
        needsWarning,
        error: null
      }
      
    } catch (error) {
      console.error('❌ Error checking chat inactivity:', error)
      return { shouldWarn: false, shouldDelete: false, error: error.message }
    }
  }
  
  // Send inactivity warning to chat participants
  static async sendInactivityWarning(inactiveChat) {
    try {
      const { chatId, chatData, warningMessage } = inactiveChat
      
      // Update chat document with warning timestamp
      await updateDoc(doc(db, 'chats', chatId), {
        inactivityWarningAt: serverTimestamp(),
        inactivityWarningSent: true
      })
      
      // Send warning message to chat
      const warningMessageData = {
        text: warningMessage || `⚠️ **Chat Inactivity Warning**\\n\\nThis chat has been inactive for 7+ days. To keep your conversation history, please respond soon. Chats without successful transactions will be automatically deleted in 7 days.`,
        senderId: 'ai-agent',
        senderName: 'AgriLink AI',
        isAISuggestion: true,
        isInactivityWarning: true,
        createdAt: new Date(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), warningMessageData)
      
      // Send notifications to both participants
      await this.sendInactivityNotifications(chatId, chatData.participants, warningMessage)
      
      console.log(`✅ Inactivity warning sent for chat ${chatId}`)
      
      return { success: true }
      
    } catch (error) {
      console.error(`❌ Error sending inactivity warning for chat ${chatId}:`, error)
      return { success: false, error: error.message }
    }
  }
  
  // Send notifications to chat participants
  static async sendInactivityNotifications(chatId, participants, message) {
    try {
      if (!participants || participants.length !== 2) {
        console.warn('⚠️ Invalid participants array for notifications')
        return
      }
      
      const notificationData = {
        title: 'Chat Inactivity Warning',
        body: 'Your chat has been inactive for 7+ days and will be deleted in 7 days if no activity occurs.',
        type: 'chat_inactivity_warning',
        chatId: chatId,
        createdAt: new Date(),
        read: false,
        data: {
          chatId: chatId,
          warningType: 'inactivity',
          willDeleteInDays: 7
        }
      }
      
      // Send notification to each participant
      for (const participantId of participants) {
        await addDoc(collection(db, 'notifications'), {
          ...notificationData,
          userId: participantId
        })
      }
      
      console.log(`✅ Inactivity notifications sent to ${participants.length} participants`)
      
    } catch (error) {
      console.error('❌ Error sending inactivity notifications:', error)
    }
  }
  
  // Mark chats for deletion and send final warnings
  static async markChatsForDeletion() {
    try {
      console.log('🗑️ Starting chat deletion marking process...')
      
      // Get chats that were warned 7+ days ago
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const chatsRef = collection(db, 'chats')
      const q = query(
        chatsRef,
        where('inactivityWarningAt', '<=', sevenDaysAgo),
        where('markedForDeletionAt', '==', null)
      )
      
      const snapshot = await getDocs(q)
      const chatsToMark = []
      
      for (const chatDoc of snapshot.docs) {
        const chatData = chatDoc.data()
        const chatId = chatDoc.id
        
        chatsToMark.push({ chatId, chatData })
      }
      
      console.log(`📊 Found ${chatsToMark.length} chats to mark for deletion`)
      
      // Mark chats for deletion
      for (const chat of chatsToMark) {
        await this.markChatForDeletion(chat)
      }
      
      return {
        success: true,
        totalChatsChecked: snapshot.size,
        markedForDeletion: chatsToMark.length
      }
      
    } catch (error) {
      console.error('❌ Error marking chats for deletion:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Mark individual chat for deletion
  static async markChatForDeletion(chat) {
    try {
      const { chatId, chatData } = chat
      
      // Update chat document
      await updateDoc(doc(db, 'chats', chatId), {
        markedForDeletionAt: serverTimestamp(),
        willBeDeletedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      })
      
      // Send final warning message
      const finalWarningMessage = {
        text: `🚨 **Final Warning - Chat Will Be Deleted**\\n\\nThis chat will be permanently deleted in 7 days due to prolonged inactivity. If you want to save this conversation, please send a message now.`,
        senderId: 'ai-agent',
        senderName: 'AgriLink AI',
        isAISuggestion: true,
        isFinalDeletionWarning: true,
        createdAt: new Date(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), finalWarningMessage)
      
      // Send final notifications
      await this.sendFinalDeletionNotifications(chatId, chatData.participants)
      
      console.log(`✅ Chat ${chatId} marked for deletion`)
      
      return { success: true }
      
    } catch (error) {
      console.error(`❌ Error marking chat ${chat.chatId} for deletion:`, error)
      return { success: false, error: error.message }
    }
  }
  
  // Send final deletion notifications
  static async sendFinalDeletionNotifications(chatId, participants) {
    try {
      if (!participants || participants.length !== 2) {
        console.warn('⚠️ Invalid participants array for final notifications')
        return
      }
      
      const notificationData = {
        title: 'Final Warning - Chat Will Be Deleted',
        body: 'Your chat will be permanently deleted in 7 days. Send a message to prevent deletion.',
        type: 'chat_final_deletion_warning',
        chatId: chatId,
        createdAt: new Date(),
        read: false,
        data: {
          chatId: chatId,
          warningType: 'final_deletion',
          willDeleteInDays: 7
        }
      }
      
      // Send notification to each participant
      for (const participantId of participants) {
        await addDoc(collection(db, 'notifications'), {
          ...notificationData,
          userId: participantId
        })
      }
      
      console.log(`✅ Final deletion notifications sent to ${participants.length} participants`)
      
    } catch (error) {
      console.error('❌ Error sending final deletion notifications:', error)
    }
  }
  
  // Delete chats marked for deletion
  static async deleteMarkedChats() {
    try {
      console.log('🗑️ Starting chat deletion process...')
      
      // Get chats marked for deletion 7+ days ago
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const chatsRef = collection(db, 'chats')
      const q = query(
        chatsRef,
        where('markedForDeletionAt', '<=', sevenDaysAgo)
      )
      
      const snapshot = await getDocs(q)
      const deletedChats = []
      
      for (const chatDoc of snapshot.docs) {
        const chatId = chatDoc.id
        
        // Delete all messages in the chat
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const messagesSnapshot = await getDocs(messagesRef)
        
        for (const messageDoc of messagesSnapshot.docs) {
          await messageDoc.ref.delete()
        }
        
        // Delete the chat document
        await chatDoc.ref.delete()
        deletedChats.push(chatId)
      }
      
      console.log(`✅ Deleted ${deletedChats.length} inactive chats`)
      
      return {
        success: true,
        totalChatsChecked: snapshot.size,
        deletedChats: deletedChats.length
      }
      
    } catch (error) {
      console.error('❌ Error deleting marked chats:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Run complete monitoring cycle (for scheduled execution)
  static async runMonitoringCycle() {
    console.log('🔄 Starting complete inactive chat monitoring cycle...')
    
    const results = {
      inactivityCheck: null,
      deletionMarking: null,
      chatDeletion: null
    }
    
    try {
      // Step 1: Check for inactive chats and send warnings
      results.inactivityCheck = await this.checkAllInactiveChats()
      
      // Step 2: Mark warned chats for deletion
      results.deletionMarking = await this.markChatsForDeletion()
      
      // Step 3: Delete chats marked for deletion
      results.chatDeletion = await this.deleteMarkedChats()
      
      console.log('✅ Complete monitoring cycle finished:', results)
      
      return {
        success: true,
        results
      }
      
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error)
      return {
        success: false,
        error: error.message,
        results
      }
    }
  }
}

export default InactiveChatMonitor
