import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocsFromCache } from 'firebase/firestore'
import styles from '../../styles/modules/dashboard.module.css'
import aiStyles from '../../styles/modules/dashboard-ai-suggestions.module.css'
import AIChatService from '../lib/aiChatService'

const Chat = ({ user, userRole, setActiveMenuItem, onUnreadChatsUpdate }) => {
  // Chat state variables
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState([])
  const [unreadChats, setUnreadChats] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [transactionSummary, setTransactionSummary] = useState(null)
  const [transactionStage, setTransactionStage] = useState('initial')
  const [chatTransactionStates, setChatTransactionStates] = useState({})
  const [requestStatus, setRequestStatus] = useState(null)
  const [listingName, setListingName] = useState(null)
  const [markAsReadTimeoutRef, setMarkAsReadTimeoutRef] = useState(null)
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Auto-scroll when conversation is selected
  useEffect(() => {
    if (selectedChat) {
      setTimeout(scrollToBottom, 100)
    }
  }, [selectedChat])

  // Format timestamp for chat messages
  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Trigger AI suggestions when new message arrives
  const triggerAISuggestions = async (messages) => {
    if (!user || !selectedChat || messages.length === 0) return;
    
    try {
      console.log('🤖 Triggering AI suggestions for chat:', selectedChat.id);
      
      // Get current chat state or use defaults (stage '1' for new conversations)
      const currentChatState = chatTransactionStates[selectedChat.chatId] || {
        stage: '1',
        language: 'english'
      };
      
      const conversationData = {
        userId: user.uid,
        userRole: userRole,
        listingName: selectedChat.listingName || 'product',
        messages: messages.map(msg => ({
          text: msg.text,
          senderName: msg.senderId === user.uid ? 'You' : selectedChat.otherUserName,
          timestamp: msg.createdAt,
          isOwnMessage: msg.senderId === user?.uid
        })),
        currentStage: currentChatState.stage,
        language: currentChatState.language
      };
      
      console.log('🤖 Sending conversation data to AI:', conversationData);
      
      // Call AI service to get suggestions
      const result = await AIChatService.generateContextualSuggestions(conversationData);
      
      if (result && result.suggestions) {
        console.log('🤖 AI Suggestions received:', result);
        setAiSuggestions(result.suggestions);
        setShowSuggestions(true);
        
        // Update chat-specific transaction state
        setChatTransactionStates(prev => ({
          ...prev,
          [selectedChat.chatId]: {
            stage: result.stage || currentChatState.stage,
            language: result.language || currentChatState.language
          }
        }));
      }
    } catch (error) {
      console.error('🤖 Error getting AI suggestions:', error);
    }
  };

  // Extract listing ID from chat messages for transaction completion
  const extractListingIdFromChat = () => {
    // Find the listing request message to get listing ID
    const listingRequestMessage = chatMessages.find(msg => msg.isListingRequest)
    if (listingRequestMessage && listingRequestMessage.listingId) {
      return listingRequestMessage.listingId
    }
    return null
  }

  // Generate contextual AI suggestions based on transaction stage
  const generateContextualSuggestions = async () => {
    if (!user || !selectedChat || !userRole) return

    try {
      console.log('🤖 Generating contextual AI suggestions for chat:', selectedChat.id)
      
      // Get chat-specific transaction state
      const chatId = selectedChat?.id
      console.log('🔍 DEBUG: Chat-Specific State Analysis')
      console.log('💬 Current chatId:', chatId)
      console.log('📊 Available states:', Object.keys(chatTransactionStates))
      
      const currentChatState = chatTransactionStates[chatId] || {
        stage: 'initial',
        language: 'english'
      }
      
      console.log('🎯 Current chat state:', currentChatState)
      
      // Check if there's an approved request in the messages
      const approvedRequest = chatMessages.find(msg => 
        msg.isListingRequest && msg.requestStatus === 'approved'
      )
      
      if (!approvedRequest) {
        console.log('❌ No approved request found, skipping suggestions')
        return
      }
      
      // Determine transaction stage based on messages and state
      const messages = chatMessages.map(msg => ({
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: msg.createdAt,
        isOwnMessage: msg.senderId === user?.uid
      }))
      
      const conversationData = {
        userId: user.uid,
        userRole,
        listingName,
        messages,
        currentStage: currentChatState.stage,
        language: currentChatState.language
      }
      
      console.log('📤 Sending conversation data to AI:', conversationData)
      
      // Call AI backend - this is the ONLY source of suggestions
      const result = await AIChatService.generateContextualSuggestions(conversationData)
      
      console.log('📥 AI response received:', result)
      
      if (result && result.suggestions && result.suggestions.length > 0) {
        console.log('✅ Setting AI suggestions:', result.suggestions)
        setAiSuggestions(result.suggestions)
        setShowSuggestions(true)
        
        // Update chat-specific transaction state from AI response
        const updatedChatState = {
          stage: result.stage || 'initial',
          language: result.language || 'english'
        }
        
        setChatTransactionStates(prev => ({
          ...prev,
          [chatId]: updatedChatState
        }))
        
        console.log('🔄 Updated chat state:', updatedChatState)
        
        // If AI suggests a summary, prepare it
        if (result.summary) {
          console.log('📋 Preparing transaction summary:', result.summary)
          setTransactionSummary(result.summary)
          setTransactionStage(result.stage || 'agreement')
          
          // Auto-send summary if AI provides it
          if (result.autoSendSummary) {
            const summaryText = `📋 Transaction Summary:\n${Object.entries(result.summary)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}`
            
            // Send the summary message automatically
            sendMessageWithText(summaryText)
          }
        }
      } else {
        console.log('❌ No suggestions received from AI')
      }
    } catch (error) {
      console.error('❌ Error generating contextual suggestions:', error)
    }
  }

  // Use an AI suggestion
  const useSuggestion = async (suggestion) => {
    try {
      console.log('🔍 DEBUG: Using AI suggestion:', suggestion)
      
      // Clear suggestions when user uses one
      setShowSuggestions(false)
      setAiSuggestions([])
      
      // Send the suggestion as a message using sendMessageWithText
      console.log('🔍 DEBUG: Calling sendMessageWithText with:', suggestion)
      await sendMessageWithText(suggestion)
      
      // After sending, trigger new suggestions based on the updated conversation
      setTimeout(() => {
        const updatedMessages = [...chatMessages, {
          text: suggestion,
          senderId: user.uid,
          createdAt: new Date()
        }]
        triggerAISuggestions(updatedMessages)
      }, 1000)
    } catch (error) {
      console.error('🔍 DEBUG: Error using suggestion:', error)
    }
  }

  // Extract request status and listing name from chat messages
  useEffect(() => {
    if (!chatMessages.length) {
      setRequestStatus(null)
      setListingName(null)
      return
    }

    // Find the listing request message
    const listingRequestMessage = chatMessages.find(msg => msg.isListingRequest)
    if (listingRequestMessage) {
      const newStatus = listingRequestMessage.requestStatus || 'pending'
      const newListingName = listingRequestMessage.listingName || 'product'
      
      console.log('📋 Found listing request:', {
        status: newStatus,
        listingName: newListingName,
        previousStatus: requestStatus
      })
      
      setRequestStatus(newStatus)
      setListingName(newListingName)
      
      // CRITICAL FIX: Reset stage ONLY for the current chat, not all chats
      const currentChatId = selectedChat?.id
      if (currentChatId) {
        setChatTransactionStates(prev => ({
          ...prev,
          [currentChatId]: {
            ...prev[currentChatId],
            stage: newStatus === 'approved' ? '1' : 'initial'
          }
        }))
      }
    } else {
      setRequestStatus(null)
      setListingName(null)
    }
  }, [chatMessages, selectedChat?.id])

  // Auto-generate AI suggestions when other user replies
  useEffect(() => {
    if (requestStatus === 'approved' && userRole && listingName && chatMessages.length > 0) {
      // Get the last message
      const lastMessage = chatMessages[chatMessages.length - 1]
      
      // Check if the last message is from the OTHER user ( not current user)
      if (lastMessage && lastMessage.senderId !== user?.uid) {
        console.log('🤖 Other user replied, triggering AI suggestions')
        generateContextualSuggestions()
      }
    }
  }, [chatMessages.length, requestStatus, userRole, listingName, user?.uid])

  // Close AI suggestions when current user sends a message or clicks suggestion
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1]
      
      // If last message is from current user, close suggestions and wait for reply
      if (lastMessage && lastMessage.senderId === user?.uid) {
        setShowSuggestions(false)
      }
    }
  }, [chatMessages.length, user?.uid])

  // Generate AI suggestions when other user replies (intelligent flow)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1]
      const isOtherUserReply = lastMessage.senderId !== user?.uid
      
      console.log('🤖 Dashboard Intelligent AI Flow Analysis:', { 
        messageCount: chatMessages.length,
        requestStatus, 
        userRole, 
        isOtherUserReply,
        lastMessageSender: lastMessage?.senderId === user?.uid ? 'current user' : 'other user'
      })
      
      // Only trigger suggestions when OTHER user replies and there's an approved request
      if (isOtherUserReply && requestStatus === 'approved' && userRole && listingName) {
        console.log('🤖 Conditions met: Other user replied with approved request')
        generateContextualSuggestions()
      }
    }
  }, [chatMessages.length, requestStatus, userRole, listingName]) // Remove waitingForReply dependency

  // Load conversations with real-time listener
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered')
    console.log('🔍 DEBUG: auth:', !!auth)
    console.log('🔍 DEBUG: db:', !!db)
    console.log('🔍 DEBUG: user:', user)
    console.log('🔍 DEBUG: userRole:', userRole)
    
    if (!auth || !db || !user || !userRole) {
      console.log('🔍 DEBUG: Missing required props, returning early')
      return
    }

    console.log('🔍 DEBUG: All props available, calling loadConversations...')
    const unsubscribe = loadConversations()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user, userRole])

  const loadConversations = () => {
    if (!user || !db || !userRole) return

    console.log('🔍 WEB CHAT: Loading conversations for user role:', userRole)

    // Set up real-time listener for chats (without orderBy to avoid index requirement)
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    
    const messageListeners = new Map() // Track message listeners to prevent duplicates
    const conversationsMap = new Map() // Use Map to prevent duplicate conversations
    
    const unsubscribe = onSnapshot(chatsQuery, (chatsSnapshot) => {
      console.log('🔄 WEB CHAT: Received chats snapshot with', chatsSnapshot.size, 'documents')
      
      chatsSnapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id
        const chatData = chatDoc.data()
        
        console.log('📝 WEB CHAT: Processing chat:', chatId, chatData)
        
        // ROLE-BASED FILTERING: matching mobile app logic exactly
        const currentUserRoleInChat = chatData.participantRoles?.[user.uid]
        
        // Skip chats where current user doesn't have the expected role
        if (currentUserRoleInChat !== userRole) {
          console.log('⚠️ WEB CHAT: Skipping chat - user role mismatch. Expected:', userRole, 'Got:', currentUserRoleInChat)
          return
        }
        
        // Find the other participant
        const otherUserId = chatData.participants?.find(id => id !== user.uid)
        
        if (otherUserId) {
          let otherUserName = chatData.participantNames[otherUserId] || 'User'
          const otherUserEmail = chatData.participantEmails?.[otherUserId] || ''
          const listingName = chatData.listingName || ''
          
          // Initialize conversation in map first (prevents duplicates)
          conversationsMap.set(chatId, {
            id: chatId,
            otherUserId,
            otherUserName,
            otherUserEmail,
            lastMessage: chatData.lastMessage || '',
            lastMessageTime: chatData.lastMessageTime,
            lastMessageSenderId: chatData.lastMessageSenderId,
            listingName,
            chatId: chatData.chatId || chatId
          })
          
          // Set up message listener for this chat ( the chatId from the chat document itself)
          const messageChatId = chatData.chatId || chatId
          
          // Clean up existing listener if any
          if (messageListeners.has(messageChatId)) {
            messageListeners.get(messageChatId)()
            messageListeners.delete(messageChatId)
          }
          
          // Set up new message listener
          const messageUnsubscribe = onSnapshot(
            query(collection(db, 'chats', messageChatId, 'messages'), orderBy('createdAt', 'asc')),
            (messagesSnapshot) => {
              console.log('💬 WEB CHAT: Messages updated for chat:', messageChatId, 'Count:', messagesSnapshot.size)
              
              const messages = messagesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              
              // Calculate unread count ( only count messages from OTHER users)
              const unreadCount = messages.filter(msg => 
                msg.senderId !== user.uid && !msg.read
              ).length
              
              // Get the actual last message
              const actualLastMessage = messages[messages.length - 1]
              const actualLastMessageTime = actualLastMessage?.createdAt
              const actualLastMessageSenderId = actualLastMessage?.senderId
              const isLastMessageFromOther = actualLastMessageSenderId !== user.uid
              
              // Update conversation in map (this prevents duplicates)
              conversationsMap.set(chatId, {
                id: chatId,
                otherUserId,
                otherUserName,
                otherUserEmail,
                lastMessage: actualLastMessage?.text || '',
                lastMessageTime: actualLastMessageTime,
                lastMessageSenderId: actualLastMessageSenderId,
                unreadCount,
                isLastMessageFromOther,
                listingName,
                chatId: messageChatId
              })
              
              // Auto-open chat if there's a new message from someone else
              if (isLastMessageFromOther && unreadCount > 0) {
                setActiveMenuItem('chat')
                setSelectedChat(null)
                setChatMessages([])
                // setShowNotifications(false) - This will be handled by parent
              }
              
              // Update conversations state from map (guaranteed no duplicates)
              const uniqueConversations = Array.from(conversationsMap.values())
              const sortedConversations = uniqueConversations.sort((a, b) => {
                if (!a.lastMessageTime && !b.lastMessageTime) return 0
                if (!a.lastMessageTime) return 1
                if (!b.lastMessageTime) return -1
                
                const timeA = a.lastMessageTime.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime)
                const timeB = b.lastMessageTime.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime)
                return timeB - timeA
              })
              
              setConversations(sortedConversations)
              const totalUnread = sortedConversations.filter(conv => conv.unreadCount > 0).length
              setUnreadChats(totalUnread)
              
              // Notify parent component about unread count change
              if (onUnreadChatsUpdate) {
                onUnreadChatsUpdate(totalUnread)
              }
            }
          )
          
          // Store the message unsubscribe function
          messageListeners.set(messageChatId, messageUnsubscribe)
        }
      })
      
      // Set initial conversations from map (no duplicates possible)
      const initialConversations = Array.from(conversationsMap.values())
      setConversations(initialConversations)
    })
    
    // Return cleanup function that removes all message listeners
    return () => {
      console.log('🧹 WEB CHAT: Cleaning up all message listeners')
      messageListeners.forEach(unsubscribe => unsubscribe())
      messageListeners.clear()
    }
  }

  const filteredConversations = conversations

  // Load messages for selected chat
  const loadChatMessages = async (chatId) => {
    if (!chatId || !db) return
    
    try {
      console.log('💬 Loading messages for chat:', chatId)
      
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
      )
      
      const messagesSnapshot = await getDocs(messagesQuery)
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setChatMessages(messages)
      
      // Trigger AI suggestions when new message arrives from other user
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.senderId !== user?.uid) {
        triggerAISuggestions(messages)
      }
      
      // Auto-scroll to bottom when new messages arrive ( instant, no animation)
      setTimeout(() => {
        const messagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
      
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user || !db) return
    
    // Clear AI suggestions immediately when user sends a message
    setShowSuggestions(false)
    setAiSuggestions([])
    
    // Check if there's an approved request - both users must wait for approval
    const hasApprovedRequest = chatMessages.some(msg => 
      msg.isListingRequest && msg.requestStatus === 'approved'
    )
    
    const isListingOwner = userRole === 'livestock_owner'
    
    // BOTH users must wait for approval - chat is disabled for everyone until approved
    const canChat = hasApprovedRequest
    
    if (!canChat) {
      console.log('❌ Cannot send message - no approved request')
      alert(isListingOwner 
        ? '💬 Chat will be available after you approve the request. Use the Accept/Decline buttons above.'
        : '💬 Chat will be available after the listing owner approves your request'
      )
      return
    }
    
    try {
      const messageData = {
        senderId: user.uid,
        senderName: user.firstName || 'User',
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData)
      setNewMessage('')
      console.log('Message sent successfully')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Send message with pre-formatted text (for summary confirmation)
  const sendMessageWithText = async (messageText) => {
    if (!messageText.trim() || !selectedChat || !user || !db) return
    
    try {
      const messageData = {
        senderId: user.uid,
        senderName: user.firstName || 'User',
        text: messageText.trim(),
        createdAt: serverTimestamp(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData)
      console.log('Summary confirmation message sent successfully')
    } catch (error) {
      console.error('Error sending summary confirmation message:', error)
    }
  }

  // Handle request response ( approve/decline)
  const handleRequestResponse = async (message, status) => {
    if (!message || !selectedChat || !db) return
    
    try {
      // Update the message status
      const chatId = selectedChat.id
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        requestStatus: status
      })
      
      // Send a response message
      const responseText = status === 'approved' 
        ? '✅ Request approved! You can now chat freely.'
        : '❌ Request declined. Thank you for your interest.'
      
      await sendMessageWithText(responseText)
      
      // If approved, trigger AI suggestions
      if (status === 'approved') {
        setTimeout(() => {
          generateContextualSuggestions()
        }, 1000)
      }
      
      console.log(`Request ${status} successfully`)
    } catch (error) {
      console.error(`Error ${status}ing request:`, error)
    }
  }

  // Go back to conversations list
  const goBackToConversations = () => {
    // Clear any pending mark-as-read timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current)
    }
    setSelectedChat(null)
    setChatMessages([])
    setNewMessage('')
    setAiSuggestions([])
    setShowSuggestions(false)
    setShowSummary(false)
    setTransactionSummary(null)
  }

  // Mark conversation as read
  const markConversationAsRead = async (conversationId) => {
    try {
      // Update the conversation in the conversations state
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
        
        // Recalculate total unread chats count
        const totalUnread = updatedConversations.reduce((total, conv) => 
          total + (conv.unreadCount > 0 ? 1 : 0), 0
        )
        setUnreadChats(totalUnread)
        
        // Notify parent component about unread count change
        if (onUnreadChatsUpdate) {
          onUnreadChatsUpdate(totalUnread)
        }
        
        return updatedConversations
      })
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }

  return (
    <div className={styles.chatDashboard}>
      {/* Chat List Panel */}
      <div className={styles.chatListPanel}>
        <div className={styles.chatListHeader}>
          <h2 className={styles.chatListTitle}>Chats</h2>
          <div className={styles.chatSearchBar}>
            <input
              type="text"
              placeholder="Search conversations..."
              className={styles.chatSearchInput}
            />
            <svg className={styles.chatSearchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className={styles.conversationsList}>
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className={`${styles.conversationCard} ${selectedChat?.id === conversation.id ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedChat(conversation)
                  loadChatMessages(conversation.id)
                  if (conversation.unreadCount > 0) {
                    markConversationAsRead(conversation.id)
                  }
                }}
              >
                <div className={styles.conversationAvatar}>
                  {conversation.otherUserName ? conversation.otherUserName[0].toUpperCase() : 'U'}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.conversationName}>
                      {conversation.otherUserName || 'User'}
                    </span>
                    {conversation.lastMessageTime && (
                      <span className={styles.conversationTime}>
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className={styles.conversationPreview}>
                    <span className={styles.lastMessage}>
                      {conversation.lastMessage}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyChatState}>
              <svg className={styles.emptyChatIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className={styles.emptyChatTitle}>No conversations yet</h3>
              <p className={styles.emptyChatSubtitle}>Start a conversation to see it here</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={styles.chatWindow}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <h3 className={styles.chatHeaderName}>{selectedChat.otherUserName}</h3>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className={styles.chatMessagesArea}>
              {chatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`${styles.messageBubble} ${message.senderId === user?.uid ? styles.sent : styles.received}`}
                >
                  <div className={styles.messageContent}>
                    <p className={styles.messageText}>{message.text}</p>
                    
                    {/* Accept/Decline buttons for listing requests */}
                    {message.isListingRequest && message.senderId !== user?.uid && message.requestStatus === 'pending' && !message.isCancelled && (
                      <div className={aiStyles.requestActions}>
                        <button 
                          className={aiStyles.acceptButton}
                          onClick={() => handleRequestResponse(message, 'approved')}
                        >
                          Accept
                        </button>
                        <button 
                          className={aiStyles.declineButton}
                          onClick={() => handleRequestResponse(message, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    
                    {/* Status indicator for processed requests */}
                    {message.isListingRequest && message.requestStatus && message.requestStatus !== 'pending' && (
                      <div className={aiStyles.requestStatus}>
                        <span className={`${aiStyles.statusBadge} ${aiStyles[message.requestStatus]}`}>
                          {message.requestStatus.charAt(0).toUpperCase() + message.requestStatus.slice(1)}
                        </span>
                      </div>
                    )}
                    
                    {/* Message time */}
                    <div className={styles.messageTime}>
                      {formatChatTimestamp(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))}

              {/* AI Suggestions Section */}
              {aiSuggestions.length > 0 && showSuggestions && (
                <div className={aiStyles.aiSuggestionsContainer}>
                  <div className={aiStyles.aiSuggestionsList}>
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className={aiStyles.suggestionBtn}
                        onClick={() => useSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Summary */}
              {showSummary && transactionSummary && (
                <div className={aiStyles.transactionSummaryContainer}>
                  <div className={aiStyles.summaryHeader}>
                    <span>📋 Transaction Summary</span>
                    <button onClick={() => setShowSummary(false)}>×</button>
                  </div>
                  <div className={aiStyles.summaryContent}>
                    <div className={aiStyles.summaryItem}>
                      <strong>Name:</strong> {transactionSummary.name}
                    </div>
                    <div className={aiStyles.summaryItem}>
                      <strong>Price:</strong> {transactionSummary.price}
                    </div>
                    <div className={aiStyles.summaryItem}>
                      <strong>Payment:</strong> {transactionSummary.paymentMethod}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll ref element */}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className={styles.chatInputArea}>
              {(() => {
                // Check if there's an approved request between these users
                const hasApprovedRequest = chatMessages.some(msg => 
                  msg.isListingRequest && msg.requestStatus === 'approved'
                )
                
                // Check if current user is the listing owner (can always chat)
                const isListingOwner = userRole === 'livestock_owner'
                
                // BOTH users must wait for approval - chat is disabled for everyone until approved
                const canChat = hasApprovedRequest
                
                if (!canChat) {
                  return (
                    <div className={styles.chatRestricted}>
                      <p className={styles.restrictedText}>
                        {isListingOwner 
                          ? '💬 Chat will be available after you approve the request. Use the Accept/Decline buttons above.'
                          : '💬 Chat will be available after the listing owner approves your request'
                        }
                      </p>
                    </div>
                  )
                }
                
                return (
                  <div className={styles.chatInputContainer}>
                    <button className={styles.chatInputButton}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className={styles.chatInputField}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendMessage()
                        }
                      }}
                    />
                    <button 
                      className={styles.chatSendButton}
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <img src="/assets/icons/send.png" alt="Send" width="20" height="20" />
                    </button>
                  </div>
                )
              })()}
            </div>
          </>
        ) : (
          <div className={styles.emptyChatState}>
            <svg className={styles.emptyChatIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={styles.emptyChatTitle}>Select a conversation</h3>
            <p className={styles.emptyChatSubtitle}>Choose a chat from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
