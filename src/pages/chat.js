import { useState, useEffect, useRef } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocsFromCache } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import styles from '../../styles/modules/chat.module.css'
import AIChatService from '../lib/aiChatService'

const Chat = ({ user, userRole, setActiveMenuItem, onUnreadChatsUpdate }) => {
  // Chat state variables
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadChats, setUnreadChats] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true)
  const [showSummary, setShowSummary] = useState(false)
  const [transactionSummary, setTransactionSummary] = useState(null)
  const [transactionStage, setTransactionStage] = useState('initial')
  const [chatTransactionStates, setChatTransactionStates] = useState({})
  const [requestStatus, setRequestStatus] = useState(null)
  const [listingName, setListingName] = useState(null)
  const [markAsReadTimeoutRef, setMarkAsReadTimeoutRef] = useState(null)
  const [sendingMessageId, setSendingMessageId] = useState(null)
  const [deliveredMessageId, setDeliveredMessageId] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Handle ESC key for fullscreen modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null)
      }
    }
    
    if (fullscreenImage) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [fullscreenImage])

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

  // Toggle AI suggestions open/closed
  const toggleSuggestions = () => {
    setIsSuggestionsOpen(!isSuggestionsOpen)
  }

  // Auto-scroll when AI suggestions appear
  useEffect(() => {
    if (showSuggestions && aiSuggestions.length > 0 && isSuggestionsOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 300) // Small delay to ensure suggestions are rendered
    }
  }, [showSuggestions, aiSuggestions.length, isSuggestionsOpen])

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  // Clear image selection
  const clearImageSelection = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload image to Firebase Storage
  const uploadImageToFirebase = async (file) => {
    console.log('🖼️ Starting Firebase Storage upload:', file?.name, file?.size)
    
    if (!file || !user || !selectedChat) {
      console.error('❌ Missing required data:', { file: !!file, user: !!user, selectedChat: !!selectedChat })
      return null
    }
    
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now()
      const filename = `${timestamp}_${file.name}`
      console.log('📁 Creating storage path:', `chatImages/${selectedChat.chatId}/${filename}`)
      
      // Create storage reference
      const storageRef = ref(storage, `chatImages/${selectedChat.chatId}/${filename}`)
      console.log('🔗 Storage reference created:', storageRef)
      
      // Upload file to Firebase Storage
      console.log('📤 Uploading file to Firebase Storage...')
      await uploadBytes(storageRef, file)
      console.log('✅ File uploaded successfully')
      
      // Get download URL
      console.log('🔗 Getting download URL...')
      const downloadURL = await getDownloadURL(storageRef)
      console.log('✅ Download URL obtained:', downloadURL)
      
      return downloadURL
    } catch (error) {
      console.error('❌ Firebase Storage upload error:', error)
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse
      })
      throw error
    }
  }

  // Format display name for chat list with truncation
  const formatChatListDisplayName = (otherUserName, listingName) => {
    if (!otherUserName) return 'User'
    
    let displayName = otherUserName
    
    // If full name is greater than 15 characters, use first name only
    if (otherUserName.length > 15) {
      const nameParts = otherUserName.split(' ')
      displayName = nameParts[0] || otherUserName
    }
    
    // Add listing name if available
    if (listingName) {
      // Truncate listing name if too long
      let truncatedListingName = listingName
      if (listingName.length > 30) {
        truncatedListingName = listingName.substring(0, 30) + '...'
      }
      displayName += ` • ${truncatedListingName}`
    }
    
    return displayName
  }

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
      setAiSuggestions([])
      setShowSuggestions(false)
      
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

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const searchLower = searchQuery.toLowerCase()
    const userNameMatch = conversation.otherUserName?.toLowerCase().includes(searchLower)
    const listingNameMatch = conversation.listingName?.toLowerCase().includes(searchLower)
    return userNameMatch || listingNameMatch
  })

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
              
              // Format last message text for chat list
              let lastMessageText = ''
              if (actualLastMessage?.imageUrl && !actualLastMessage?.text) {
                // Image-only message
                if (actualLastMessageSenderId === user.uid) {
                  lastMessageText = 'You sent an image'
                } else {
                  lastMessageText = `${actualLastMessage.senderName || 'Someone'} sent you an image`
                }
              } else if (actualLastMessage?.text) {
                // Text message (or text + image)
                lastMessageText = actualLastMessage.text
              } else if (actualLastMessage?.imageUrl && actualLastMessage?.text) {
                // Text + image message - show text with image indicator
                lastMessageText = actualLastMessage.text
              }
              
              // Update conversation in map (this prevents duplicates)
              conversationsMap.set(chatId, {
                id: chatId,
                otherUserId,
                otherUserName,
                otherUserEmail,
                lastMessage: lastMessageText,
                lastMessageTime: actualLastMessageTime,
                lastMessageSenderId: actualLastMessageSenderId,
                unreadCount: isLastMessageFromOther ? unreadCount : 0,
                isLastMessageFromOther,
                listingName,
                chatId: messageChatId
              })
              
              // Auto-open chat if there's a new message from someone else
              if (isLastMessageFromOther && unreadCount > 0) {
                setActiveMenuItem('chat')
                // Don't clear messages - let user see existing conversation
                if (!selectedChat) {
                  setSelectedChat(null)
                  setChatMessages([])
                }
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

  // Load messages for selected chat with real-time listener
  const loadChatMessages = (chatId) => {
    if (!chatId || !db) return null
    
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    
    const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Replace all messages with new conversation's messages
      setChatMessages(messages)
      
      // Ensure scroll to bottom when conversation loads ( fix inconsistent scrolling)
      setTimeout(() => {
        scrollToBottom()
      }, 100)
      
      // Trigger AI suggestions when new message arrives from other user
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.senderId !== user?.uid) {
        triggerAISuggestions(messages)
      }
      
      // Auto-scroll to bottom when new messages arrive (instant, no animation)
      setTimeout(() => {
        const messagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    })
    
    return unsubscribe
  }

  // Manage real-time message listener for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([])
      return
    }

    // Use chatId if available, otherwise fallback to id
    const chatIdToUse = selectedChat.chatId || selectedChat.id

    const unsubscribe = loadChatMessages(chatIdToUse)
    
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [selectedChat?.id, selectedChat?.chatId])

  // Send a new message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedChat || !user || !db) return
    
    const messageText = newMessage.trim()
    setNewMessage('')
    
    setDeliveredMessageId(null)
    setShowSuggestions(false)
    setAiSuggestions([])
    
    // Use chatId if available, otherwise fallback to id
    const chatIdToUse = selectedChat.chatId || selectedChat.id
    
    const hasApprovedRequest = chatMessages.some(msg => 
      msg.isListingRequest && msg.requestStatus === 'approved'
    )
    
    const isListingOwner = userRole === 'livestock_owner'
    const canChat = hasApprovedRequest
    
    if (!canChat) {
      console.log('❌ Cannot send message - no approved request')
      alert(isListingOwner 
        ? '💬 Chat will be available after you approve the request. Use the Accept/Decline buttons above.'
        : '💬 Chat will be available after the listing owner approves your request'
      )
      return
    }
    
    setSendingMessageId('sending')
    
    try {
      let imageUrl = null
      
      // Upload image if present
      if (selectedImage) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadImageToFirebase(selectedImage)
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError)
          alert('Failed to upload image. Please try again.')
          setUploadingImage(false)
          setSendingMessageId(null)
          return
        }
        setUploadingImage(false)
        clearImageSelection()
      }
      
      // Split into separate messages if both image and text exist
      if (imageUrl && messageText) {
        // Send image message first
        const imageMessageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: '',
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const imageDocRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), imageMessageData)
        
        // Send text message immediately after
        const textMessageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: messageText,
          imageUrl: null,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const textDocRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), textMessageData)
        
        setSendingMessageId(null)
        setDeliveredMessageId(textDocRef.id)
        
      } else {
        // Send single message (image-only or text-only)
        const messageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: messageText,
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const docRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), messageData)
        
        setSendingMessageId(null)
        setDeliveredMessageId(docRef.id)
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setSendingMessageId(null)
      setUploadingImage(false)
      alert('Failed to send message. Please try again.')
    }
  }

  // Send message with pre-formatted text (for summary confirmation)
  const sendMessageWithText = async (messageText) => {
    if (!messageText.trim() || !selectedChat || !user || !db) return
    
    // Clear AI suggestions when user sends a message
    setAiSuggestions([])
    setShowSuggestions(false)
    
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
    <>
      <div className={styles.chatDashboard}>
      {/* Chat List Panel */}
      <div className={styles.chatListPanel}>
        <div className={styles.chatListHeader}>
          <h1 className={styles.title}>Chats</h1>
        </div>
        <div className={styles.chatSearchBar}>
          <input
            type="text"
            placeholder="Search conversations..."
            className={styles.chatSearchInput}
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <svg className={styles.chatSearchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className={styles.conversationsList}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className={`${styles.conversationCard} ${selectedChat?.id === conversation.id ? styles.selected : ''}`}
                onClick={() => {
                  // Clear AI suggestions when switching conversations
                  setAiSuggestions([])
                  setShowSuggestions(false)
                  
                  setSelectedChat(conversation)
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
                      {formatChatListDisplayName(conversation.otherUserName, conversation.listingName)}
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
          ) : searchQuery ? (
            <div className={styles.emptyChatState}>
              <h3 className={styles.emptyChatTitle}>No conversations found</h3>
              <p className={styles.emptyChatSubtitle}>Try searching with different keywords</p>
            </div>
          ) : (
            <div className={styles.emptyChatState}>
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
                <h3 className={styles.chatHeaderName}>{formatChatListDisplayName(selectedChat.otherUserName, selectedChat.listingName)}</h3>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className={styles.chatMessagesArea}>
              {chatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`${message.senderId === user?.uid ? styles.sentMessageWrapper : styles.receivedMessageWrapper}`}
                >
                  {/* For image-only messages (both sent and received), render completely outside messageBubble */}
                  {message.imageUrl && message.imageUrl !== 'pending' && !message.text && (
                    <img 
                      src={message.imageUrl} 
                      alt="Shared image" 
                      className={styles.standaloneMessageImage}
                      onClick={() => setFullscreenImage(message.imageUrl)}
                    />
                  )}
                  
                  {/* For messages with text or pending uploads, use messageBubble wrapper */}
                  {(message.text || message.imageUrl === 'pending') && (
                    <div className={`${styles.messageBubble} ${message.senderId === user?.uid ? styles.sent : styles.received}`}>
                      <div className={styles.messageContent}>
                        {/* Display text if present */}
                        {message.text && (
                          <p className={styles.messageText}>{message.text}</p>
                        )}
                        
                        {/* Display image if present alongside text */}
                        {message.imageUrl === 'pending' && (
                          <div className={styles.imageLoadingPlaceholder}>
                            <div className={styles.uploadingSpinner}>⏳</div>
                            <span>Uploading image...</span>
                          </div>
                        )}
                        
                        {message.imageUrl && message.imageUrl !== 'pending' && message.text && (
                          <img 
                            src={message.imageUrl} 
                            alt="Shared image" 
                            className={styles.messageImage}
                            onClick={() => setFullscreenImage(message.imageUrl)}
                          />
                        )}
                        
                        {/* Show placeholder if no text or image */}
                        {!message.text && !message.imageUrl && (
                          <p className={styles.messageText}>Empty message</p>
                        )}
                        
                        {/* Accept/Decline buttons for listing requests */}
                        {message.isListingRequest && message.senderId !== user?.uid && message.requestStatus === 'pending' && !message.isCancelled && (
                          <div className={styles.requestActions}>
                            <button 
                              className={styles.acceptButton}
                              onClick={() => handleRequestResponse(message, 'approved')}
                            >
                              Accept
                            </button>
                            <button 
                              className={styles.declineButton}
                              onClick={() => handleRequestResponse(message, 'declined')}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        
                        {/* Status indicator for processed requests */}
                        {message.isListingRequest && message.requestStatus && message.requestStatus !== 'pending' && (
                          <div className={styles.requestStatus}>
                            <span className={`${styles.statusBadge} ${styles[message.requestStatus]}`}>
                              {message.requestStatus.charAt(0).toUpperCase() + message.requestStatus.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Accept/Decline buttons for standalone images */}
                  {message.senderId !== user?.uid && message.imageUrl && message.imageUrl !== 'pending' && !message.text && message.isListingRequest && message.requestStatus === 'pending' && !message.isCancelled && (
                    <div className={styles.requestActions}>
                      <button 
                        className={styles.acceptButton}
                        onClick={() => handleRequestResponse(message, 'approved')}
                      >
                        Accept
                      </button>
                      <button 
                        className={styles.declineButton}
                        onClick={() => handleRequestResponse(message, 'declined')}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  
                  {/* Message time - positioned beside bubble on hover */}
                  {(message.text || message.imageUrl) && (
                    <div className={styles.messageTime}>
                      {formatChatTimestamp(message.createdAt)}
                    </div>
                  )}
                  
                  {/* Sending/Delivered status indicator - positioned below bubble */}
                  {message.senderId === user?.uid && (
                    <div className={styles.deliveredText}>
                      {sendingMessageId === 'sending' && chatMessages[chatMessages.length - 1]?.id === message.id && 'sending'}
                      {deliveredMessageId === message.id && 'delivered'}
                    </div>
                  )}
                </div>
              ))}

              {/* AI Suggestions Section */}
              {aiSuggestions.length > 0 && showSuggestions && requestStatus === 'approved' && (
                <div className={`${styles.aiSuggestionsContainer} ${!isSuggestionsOpen ? styles.collapsed : ''}`}>
                  {/* Collapsible Header */}
                  <div className={styles.aiSuggestionsHeader} onClick={toggleSuggestions}>
                    <div className={styles.aiSuggestionsTitle}>
                      <span className={styles.aiIcon}>🤖</span>
                      AI message suggestions
                    </div>
                    <button className={styles.toggleSuggestionsBtn}>
                      {isSuggestionsOpen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Collapsible Content */}
                  {isSuggestionsOpen && (
                    <div className={styles.aiSuggestionsList}>
                      {aiSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className={styles.suggestionBtn}
                          onClick={() => useSuggestion(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Summary */}
              {showSummary && transactionSummary && (
                <div className={styles.transactionSummaryContainer}>
                  <div className={styles.summaryHeader}>
                    <span>📋 Transaction Summary</span>
                    <button onClick={() => setShowSummary(false)}>×</button>
                  </div>
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryItem}>
                      <strong>Name:</strong> {transactionSummary.name}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Price:</strong> {transactionSummary.price}
                    </div>
                    <div className={styles.summaryItem}>
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
              {/* Image Preview - moved above input */}
              {imagePreview && (
                <div className={styles.imagePreviewContainer}>
                  <div className={styles.imagePreviewWrapper}>
                    <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                    <button onClick={clearImageSelection} className={styles.removeImageButton}>×</button>
                  </div>
                </div>
              )}
              
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <button 
                      className={styles.chatInputButton}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <img src="/assets/icons/add-image.png" alt="Add Image" width="20" height="20" />
                    </button>
                    <textarea
                      placeholder="Type a message..."
                      className={styles.chatInputField}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={1}
                    />
                    <button 
                      className={styles.chatSendButton}
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && !selectedImage || uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className={styles.uploadingSpinner}>⏳</div>
                      ) : (
                        <img src="/assets/icons/send.png" alt="Send" width="20" height="20" />
                      )}
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
    
    {/* Fullscreen Image Modal - Outside chatDashboard to escape stacking context */}
    {fullscreenImage && (
      <div 
        className={styles.fullscreenModal}
        onClick={() => setFullscreenImage(null)}
      >
        <img 
          src={fullscreenImage} 
          alt="Fullscreen image" 
          className={styles.fullscreenImage}
        />
        <button 
          className={styles.fullscreenCloseButton}
          onClick={(e) => {
            e.stopPropagation()
            setFullscreenImage(null)
          }}
        >
          ×
        </button>
      </div>
    )}
    </>
  )
}

export default Chat
